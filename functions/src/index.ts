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
import cors = require("cors");
import * as nodemailer from "nodemailer";

// Erstelle die Express-Anwendung
const app = express();

// Aktiviere CORS-Middleware mit erweiterten Optionen
app.use(cors({
  origin: "*",
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json());

// Add preflight handling
app.options("*", cors());

// Konfiguriere den SMTP-Transporter
const transporter = nodemailer.createTransport({
  host: "smtp.world4you.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: "horizon@atg-at.net",
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Kontaktformular-Endpunkt
app.post("/sendContactEmail", async (req: Request, res: Response): Promise<void> => {
  try {
    const {firstName, lastName, email, message} = req.body;

    // Überprüfe, ob alle erforderlichen Felder vorhanden sind
    if (!firstName || !lastName || !email || !message) {
      res.status(400).send("Missing required fields");
      return;
    }

    // E-Mail an das Büro
    const mailOptions = {
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
    };

    // Auto-Antwort an den Kunden
    const customerMailOptions = {
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
    };

    // Sende beide E-Mails
    await transporter.sendMail(mailOptions);
    await transporter.sendMail(customerMailOptions);

    // Erfolgsmeldung zurückgeben
    res.status(200).json({success: true, message: "Emails sent successfully"});
  } catch (error) {
    console.error("Error sending email:", error);

    // Fehlerantwort zurückgeben
    res.status(500).json({success: false, message: "Error sending email"});
  }
});

// Exportiere die Express-Anwendung als Firebase Cloud Function
export const api = functions.https.onRequest(app);
