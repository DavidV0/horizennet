/**
 * Import function triggers from their respective submodules:
 *
 * import { onCall } from "firebase-functions/v2/https";
 * import { onDocumentWritten } from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions";
import express, {Request, Response} from "express";
import cors from "cors";
import * as nodemailer from "nodemailer";
import {Stripe} from "stripe";
import * as dotenv from "dotenv";
import * as admin from "firebase-admin";
import PDFDocument from "pdfkit";
dotenv.config();

admin.initializeApp();

// Initialisiere Express App
const app = express();

// CORS Middleware
app.use(cors({origin: true}));

// Body Parser Middleware für JSON-Anfragen
app.use(express.json());

// Raw Body Parser für Stripe Webhooks
app.use("/webhook", express.raw({type: "application/json"}));

// Initialisiere Stripe mit dem Secret Key
const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY || functions.config().stripe.secret_key,
    {apiVersion: "2024-12-18.acacia"}
);

// Nodemailer Transport
const transporter = nodemailer.createTransport({
  host: "smtp.world4you.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER || "horizon@atg-at.net",
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Konfiguriere die Basis-URL basierend auf der Umgebung
const BASE_URL = process.env.NODE_ENV === "production" ?
  "https://horizonnet.at" :
  "http://localhost:4200";

// Contact Form Endpoint
app.post("/sendContactEmail", async (req: Request, res: Response): Promise<void> => {
  const {firstName, lastName, email, message} = req.body;

  if (!firstName || !lastName || !email || !message) {
    res.status(400).json({error: "All fields are required"});
    return;
  }

  try {
    // Email an das Büro
    await transporter.sendMail({
      from: "\"HorizonNet\" <horizon@atg-at.net>",
      to: "horizon@atg-at.net",
      subject: `Neue Kontaktanfrage von ${firstName} ${lastName}`,
      text: message,
      html: `
        <h2>Neue Kontaktanfrage</h2>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Nachricht:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    });

    // Bestätigungs-Email an den Kunden
    await transporter.sendMail({
      from: "\"HorizonNet\" <horizon@atg-at.net>",
      to: email,
      subject: "Vielen Dank für Ihre Nachricht",
      text: `
        Hallo ${firstName} ${lastName},

        Vielen Dank für Ihre Nachricht. Wir werden uns in Kürze bei Ihnen melden.

        Beste Grüße,
        Ihr HorizonNet Team
      `,
      html: `
        <h2>Vielen Dank für Ihre Nachricht</h2>
        <p>Hallo ${firstName} ${lastName},</p>
        <p>Vielen Dank für Ihre Nachricht. Wir werden uns in Kürze bei Ihnen melden.</p>
        <p>Beste Grüße,<br>Ihr HorizonNet Team</p>
      `,
    });

    res.status(200).json({message: "Emails sent successfully"});
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({error: "Failed to send email"});
  }
});

// Stripe Payment Intent erstellen
app.post("/create-payment-intent", async (req: Request, res: Response) => {
  try {
    const {amount} = req.body;

    if (!amount) {
      res.status(400).json({error: "Amount is required"});
      return;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "eur",
    });

    res.json({clientSecret: paymentIntent.client_secret});
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({error: "Error creating payment intent"});
  }
});

// Stripe Webhook Handler
app.post("/webhook", async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    res.status(400).send("No signature provided");
    return;
  }

  try {
    const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe.webhook_secret
    );

    // Handle verschiedene Event-Typen
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        console.log("PaymentIntent erfolgreich!", paymentIntent);
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        console.log("Zahlung fehlgeschlagen!", paymentIntent);
        break;
      }
      default: {
        console.log(`Unbehandelter Event-Typ ${event.type}`);
      }
    }

    res.json({received: true});
  } catch (err) {
    console.error("Webhook Error:", err);
    res.status(400).send("Webhook Error");
  }
});

interface PurchaseConfirmationData {
  email: string;
  productKey: string;
  firstName: string;
  lastName: string;
  [key: string]: any;
}

interface ActivationConfirmationData {
  email: string;
  password: string;
}

export const sendPurchaseConfirmation = functions.https.onCall(async (request: functions.https.CallableRequest<PurchaseConfirmationData>) => {
  const {email, productKey, firstName, lastName} = request.data;

  // Generate invoice PDF
  const invoicePdf = await generateInvoicePdf(request.data);

  // Get all required PDFs from Storage
  const agbBuffer = await admin.storage().bucket().file("documents/agb.pdf").download();
  const datenschutzBuffer = await admin.storage().bucket().file("documents/datenschutz.pdf").download();
  const widerrufsbelehrungBuffer = await admin.storage().bucket().file("documents/widerrufsbelehrung.pdf").download();

  // Send email
  await transporter.sendMail({
    from: "\"HorizonNet\" <horizon@atg-at.net>",
    to: email,
    subject: "Ihre Bestellung - Produktschlüssel und Dokumente",
    html: `
      <h1>Vielen Dank für Ihre Bestellung!</h1>
      <p>Sehr geehrte(r) ${firstName} ${lastName},</p>
      <p>Ihr Produktschlüssel lautet: <strong>${productKey}</strong></p>
      <p>Um Ihren Produktschlüssel einzulösen, klicken Sie bitte auf folgenden Link:</p>
      <p><a href="${BASE_URL}/activate?key=${productKey}">Produktschlüssel einlösen</a></p>
      <p>Im Anhang finden Sie:</p>
      <ul>
        <li>Ihre Rechnung</li>
        <li>Unsere Allgemeinen Geschäftsbedingungen (AGB)</li>
        <li>Unsere Datenschutzerklärung</li>
        <li>Die Widerrufsbelehrung</li>
      </ul>
      <p>Bitte lesen Sie die beigefügten Dokumente sorgfältig durch.</p>
      <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
      <p>Mit freundlichen Grüßen,<br>Ihr HorizonNet Team</p>
    `,
    attachments: [
      {
        filename: "Rechnung.pdf",
        content: invoicePdf,
      },
      {
        filename: "AGB.pdf",
        content: agbBuffer[0],
      },
      {
        filename: "Datenschutzerklärung.pdf",
        content: datenschutzBuffer[0],
      },
      {
        filename: "Widerrufsbelehrung.pdf",
        content: widerrufsbelehrungBuffer[0],
      },
    ],
  });

  return {success: true};
});

export const sendActivationConfirmation = functions.https.onCall(async (request: functions.https.CallableRequest<ActivationConfirmationData>) => {
  const {email, password} = request.data;

  await transporter.sendMail({
    from: "\"HorizonNet\" <horizon@atg-at.net>",
    to: email,
    subject: "Ihr Account wurde aktiviert",
    html: `
      <h1>Ihr Account wurde erfolgreich aktiviert!</h1>
      <p>Sie können sich nun mit folgenden Zugangsdaten einloggen:</p>
      <p><strong>E-Mail:</strong> ${email}</p>
      <p><strong>Passwort:</strong> ${password}</p>
      <p><strong>Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach dem ersten Login.</p>
      <p>Zum Login gelangen Sie hier:</p>
      <p><a href="${BASE_URL}/login">Zum Login</a></p>
      <p>In Ihrem Kundendashboard finden Sie alle wichtigen Informationen und Dokumente.</p>
      <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
      <p>Mit freundlichen Grüßen,<br>Ihr HorizonNet Team</p>
    `,
  });

  return {success: true};
});

/**
 * Generates a PDF invoice for a purchase
 * @param {PurchaseConfirmationData} data The purchase data
 * @returns {Promise<Buffer>} The generated PDF as a buffer
 */
async function generateInvoicePdf(data: PurchaseConfirmationData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.fontSize(25).text("Rechnung", {align: "center"});
    doc.moveDown();

    // Company Information
    doc.fontSize(12).text("HorizonNet", {align: "left"});
    doc.text("ATG Consulting GmbH");
    doc.text("Musterstraße 1");
    doc.text("1234 Wien");
    doc.text("Österreich");
    doc.text("UID: ATU12345678");
    doc.moveDown();

    // Customer Information
    doc.text("Rechnungsempfänger:", {underline: true});
    doc.text(`${data.firstName} ${data.lastName}`);
    doc.text(`${data.street} ${data.streetNumber}`);
    doc.text(`${data.zipCode} ${data.city}`);
    doc.text(`${data.country}`);
    doc.moveDown();

    // Invoice Details
    const date = new Date();
    doc.text("Rechnungsdatum:", {underline: true});
    doc.text(date.toLocaleDateString("de-AT"));
    doc.text("Rechnungsnummer:", {underline: true});
    doc.text(`INV-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}-${Math.random().toString(36).substring(7)}`);
    doc.moveDown();

    // Product Details
    doc.text("Produkte:", {underline: true});
    doc.text("HorizonNet Professional Lizenz");
    doc.text(`Produktschlüssel: ${data.productKey}`);
    if (data.paymentPlan > 0) {
      doc.text(`Zahlungsplan: ${data.paymentPlan} Monatsraten`);
    }
    doc.moveDown();

    // Payment Information
    doc.text("Zahlungsinformationen:", {underline: true});
    doc.text("Die Zahlung wurde erfolgreich per Kreditkarte durchgeführt.");
    doc.moveDown();

    // Footer
    doc.fontSize(10).text("Vielen Dank für Ihren Einkauf!", {align: "center"});
    doc.text("Bei Fragen stehen wir Ihnen gerne zur Verfügung.", {align: "center"});
    doc.text("Mit freundlichen Grüßen,", {align: "center"});
    doc.text("Ihr HorizonNet Team", {align: "center"});

    doc.end();
  });
}

// Exportiere die Express-Anwendung als Firebase Cloud Function
export const api = functions.https.onRequest(app);
