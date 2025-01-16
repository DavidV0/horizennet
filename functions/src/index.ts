import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import express, { Request, Response } from "express";
import cors from "cors";
import { Stripe } from "stripe";
import * as dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();
admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

// Log the key being used (masked)
console.log('Using Stripe key:', process.env.STRIPE_SECRET_KEY?.substring(0, 8) + '...');

// Nodemailer Transport
const transporter = nodemailer.createTransport({
  host: "smtp.world4you.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || "horizon@atg-at.net",
    pass: process.env.EMAIL_PASSWORD || functions.config().email.password,
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true,
  logger: true
});

// Verify transporter connection
transporter.verify(function(error, success) {
  if (error) {
    console.error('Transporter verification failed:', error);
  } else {
    console.log('Transporter is ready to send emails');
  }
});

// Base URL configuration
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? "https://horizonnet-consulting.at"
  : "http://localhost:4200";

// Contact Form Endpoint
app.post("/api/contact", async (req: Request, res: Response): Promise<void> => {
  const {firstName, lastName, email, message} = req.body;

  if (!firstName || !lastName || !email || !message) {
    res.status(400).json({error: "All fields are required"});
    return;
  }

  try {
    await transporter.sendMail({
      from: "\"HorizonNet\" <horizon@atg-at.net>",
      to: "horizon@atg-at.net",
      subject: `Neue Kontaktanfrage von ${firstName} ${lastName}`,
      html: `
        <h2>Neue Kontaktanfrage</h2>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Nachricht:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    });

    await transporter.sendMail({
      from: "\"HorizonNet\" <horizon@atg-at.net>",
      to: email,
      subject: "Vielen Dank für Ihre Nachricht",
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

interface PurchaseConfirmationData {
  email: string;
  firstName: string;
  lastName: string;
  orderId: string;
  amount: number;
  paymentPlan: number;
  billingDetails: {
    street: string;
    streetNumber: string;
    zipCode: string;
    city: string;
    country: string;
  };
  productType?: 'academy' | 'crypto';
  isSalesPartner?: boolean;
}

interface ActivationConfirmationData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  userId: string;
  productType: string;
}

interface EmailAttachment {
  filename: string;
  content?: Buffer;
  path?: string;
}

// Generate unique product key
const generateProductKey = async (productType: string): Promise<string> => {
  const prefix = productType === 'academy' ? 'ACAD' : 'CRYP';
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Store initial product key in Firestore
const storeInitialProductKey = async (productKey: string, data: PurchaseConfirmationData) => {
  const productKeyData = {
    productKey,
    productType: data.productType || 'crypto',
    customerEmail: data.email,
    email: data.email,  // Keep both for compatibility
    firstName: data.firstName,
    lastName: data.lastName,
    street: data.billingDetails.street,
    streetNumber: data.billingDetails.streetNumber,
    zipCode: data.billingDetails.zipCode,
    city: data.billingDetails.city,
    country: data.billingDetails.country,
    paymentPlan: data.paymentPlan,
    purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    isActivated: false,
    isSalesPartner: data.isSalesPartner || false,
    status: 'active'
  };

  await admin.firestore().collection('productKeys').doc(productKey).set(productKeyData);
};

// Send purchase confirmation email
const sendPurchaseConfirmationHandler = async (req: Request, res: Response) => {
  try {
    const data = req.body as PurchaseConfirmationData;
    
    // Generate product key first
    const productKey = await generateProductKey(data.productType || 'crypto');
    
    // Store customer data with the product key
    await storeInitialProductKey(productKey, data);
    
    // Get the payment intent to find the invoice
    const paymentIntent = await stripe.paymentIntents.retrieve(data.orderId);
    const invoiceId = paymentIntent.metadata.invoice_id;
    
    // Get the invoice
    const invoice = await stripe.invoices.retrieve(invoiceId);

    // Prepare attachments array with invoice URL
    const attachments: EmailAttachment[] = [];

    // Add invoice URL if available
    if (invoice.invoice_pdf) {
      attachments.push({
        filename: 'rechnung.pdf',
        path: invoice.invoice_pdf
      });
    }

    // Try to get additional attachments from storage
    try {
      const bucket = admin.storage().bucket();
      
      // Try to get AGB
      try {
        const [agbFile] = await bucket.file('documents/agb.pdf').download();
        attachments.push({
          filename: 'agb.pdf',
          content: agbFile
        });
      } catch (error) {
        console.warn('AGB file not found:', error);
      }

      // Try to get Datenschutz
      try {
        const [datenschutzFile] = await bucket.file('documents/datenschutz.pdf').download();
        attachments.push({
          filename: 'datenschutz.pdf',
          content: datenschutzFile
        });
      } catch (error) {
        console.warn('Datenschutz file not found:', error);
      }

      // Try to get Widerruf
      try {
        const [widerrufFile] = await bucket.file('documents/widerrufsbelehrung.pdf').download();
        attachments.push({
          filename: 'widerrufsbelehrung.pdf',
          content: widerrufFile
        });
      } catch (error) {
        console.warn('Widerruf file not found:', error);
      }

      // Try to get sales partner agreement if applicable
      if (data.productType === 'academy' && data.isSalesPartner) {
        try {
          const [vertragFile] = await bucket.file('documents/vertriebspartnervertrag.pdf').download();
          attachments.push({
            filename: 'vertriebspartnervertrag.pdf',
            content: vertragFile
          });
        } catch (error) {
          console.warn('Vertriebspartnervertrag file not found:', error);
        }
      }
    } catch (error) {
      console.warn('Error getting attachments from storage:', error);
    }

    // Send email with all attachments
    await transporter.sendMail({
      from: '"HorizonNet" <horizon@atg-at.net>',
      to: data.email,
      subject: 'Ihre Bestellung bei HorizonNet',
      html: `
        <h1>Vielen Dank für Ihre Bestellung!</h1>
        <p>Sehr geehrte(r) ${data.firstName} ${data.lastName},</p>
        <p>vielen Dank für Ihre Bestellung bei HorizonNet. Im Anhang finden Sie:</p>
        <ul>
          <li>Ihre Rechnung</li>
          <li>Unsere AGB</li>
          <li>Datenschutzerklärung</li>
          <li>Widerrufsbelehrung</li>
          ${data.productType === 'academy' && data.isSalesPartner ? '<li>Vertriebspartnervertrag (bitte unterschrieben zurücksenden)</li>' : ''}
        </ul>
        ${invoice.hosted_invoice_url ? `
        <p>Sie können Ihre Rechnung auch online unter folgendem Link abrufen:</p>
        <p><a href="${invoice.hosted_invoice_url}">${invoice.hosted_invoice_url}</a></p>
        ` : ''}
        <p><strong>Ihr Produktschlüssel: ${productKey}</strong></p>
        <p>Um Ihren Zugang zu aktivieren, klicken Sie bitte auf folgenden Link:</p>
        <p><a href="${BASE_URL}/activate?key=${productKey}">Zugang aktivieren</a></p>
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        <p>Mit freundlichen Grüßen<br>Ihr HorizonNet Team</p>
      `,
      attachments
    });

    console.log('Purchase confirmation email sent successfully');
    res.json({ success: true, productKey });
  } catch (error) {
    console.error('Error sending purchase confirmation:', error);
    res.status(500).json({ error: 'Failed to send purchase confirmation' });
  }
};

// Update product key and send activation email
export const sendActivationConfirmation = functions.https.onCall(async (request: functions.https.CallableRequest<ActivationConfirmationData>) => {
  const {email, password, firstName, lastName, userId, productType} = request.data;

  try {
    // Update the product key with user information
    const productKeyDoc = await admin.firestore()
      .collection('productKeys')
      .where('customerEmail', '==', email)
      .where('isActivated', '==', false)
      .where('productType', '==', productType)
      .limit(1)
      .get();

    if (productKeyDoc.empty) {
      throw new Error('No valid product key found for this email and product type');
    }

    const productKey = productKeyDoc.docs[0].id;

    // Update product key with user information
    await admin.firestore().collection('productKeys').doc(productKey).update({
      userId,
      isActivated: true,
      activatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update user's document with the product access
    await admin.firestore().collection('users').doc(userId).update({
      [`products.${productType}`]: {
        activated: true,
        productKey,
        activatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    });

    // Send activation email with login credentials
    await transporter.sendMail({
      from: "\"HorizonNet\" <horizon@atg-at.net>",
      to: email,
      subject: "Ihr Account wurde aktiviert",
      html: `
        <h1>Ihr Account wurde erfolgreich aktiviert!</h1>
        <p>Hallo ${firstName || ''} ${lastName || ''},</p>
        <p>Sie können sich nun mit folgenden Zugangsdaten einloggen:</p>
        <p><strong>E-Mail:</strong> ${email}</p>
        <p><strong>Passwort:</strong> ${password}</p>
        <p><strong>Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach dem ersten Login.</p>
        <p>Zum Login gelangen Sie hier:</p>
        <p><a href="${BASE_URL}/login">Zum Login</a></p>
        <p>In Ihrem Kundendashboard finden Sie alle wichtigen Informationen und Dokumente.</p>
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        <p>Mit freundlichen Grüßen,<br>Ihr HorizonNet Team</p>
      `
    });

    console.log('Activation confirmation email sent successfully');
    return { success: true };
  } catch (error: any) {
    console.error('Error sending activation confirmation:', error);
    throw new functions.https.HttpsError('internal', `Failed to send email: ${error.message}`);
  }
});

// Create Customer
const createCustomer = async (req: Request, res: Response) => {
  try {
    const { email, name, payment_method } = req.body;

    if (!email || !name) {
      res.status(400).json({ error: "Email and name are required" });
      return;
    }

    const customerData: any = {
      email,
      name,
    };

    if (payment_method) {
      customerData.payment_method = payment_method;
      customerData.invoice_settings = {
        default_payment_method: payment_method
      };
    }

    const customer = await stripe.customers.create(customerData);

    if (payment_method) {
      await stripe.paymentMethods.attach(payment_method, {
        customer: customer.id,
      });
    }

    res.json(customer);
  } catch (error: any) {
    console.error("Error creating customer:", error);
    res.status(error.statusCode || 500).json({ 
      error: "Error creating customer",
      details: error.message
    });
  }
};

// Get Customer
const getCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const customer = await stripe.customers.retrieve(customerId);
    
    if (customer.deleted) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    res.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({ error: "Error fetching customer" });
  }
};

// Create Payment Intent
const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { amount, currency = "eur", customer, payment_method } = req.body;

    // Create an invoice
    const invoice = await stripe.invoices.create({
      customer,
      auto_advance: true, // Auto-finalize the draft
      collection_method: 'charge_automatically',
      pending_invoice_items_behavior: 'include'
    });

    // Add invoice item directly without storing the result
    await stripe.invoiceItems.create({
      customer,
      amount: Math.round(amount * 100),
      currency,
      description: 'HorizonNet Produkt',
      invoice: invoice.id
    });

    // Finalize and pay the invoice
    await stripe.invoices.finalizeInvoice(invoice.id);

    // Create payment intent with the invoice
    const paymentIntentData: any = {
      amount: Math.round(amount * 100),
      currency,
      customer,
      payment_method,
      confirmation_method: 'manual',
      capture_method: 'automatic',
      metadata: {
        invoice_id: invoice.id
      }
    };

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    res.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
      status: paymentIntent.status,
      invoice_id: invoice.id
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: "Error creating payment intent" });
  }
};

// Retry Payment
const retryPayment = async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.params;
    const { paymentMethodId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent || paymentIntent.status === 'succeeded') {
      res.status(400).json({ error: "Payment intent cannot be retried" });
      return;
    }

    if (paymentMethodId) {
      await stripe.paymentIntents.update(paymentIntentId, {
        payment_method: paymentMethodId
      });
    }

    const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntentId);

    res.json({
      id: confirmedIntent.id,
      status: confirmedIntent.status,
      clientSecret: confirmedIntent.client_secret,
    });
  } catch (error) {
    console.error("Error retrying payment:", error);
    res.status(500).json({ error: "Error retrying payment" });
  }
};

// Create Subscription
const createSubscription = async (req: Request, res: Response) => {
  try {
    const { priceId, customerId, paymentMethodId } = req.body;

    // First attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set it as the default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription'
      },
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    });

    const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent;

    res.json({
      id: subscription.id,
      status: subscription.status,
      clientSecret: paymentIntent?.client_secret,
      currentPeriodEnd: subscription.current_period_end,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).json({ error: "Error creating subscription" });
  }
};

// Get Subscription Status
const getSubscriptionStatus = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    res.json({
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ error: "Error fetching subscription" });
  }
};

// Cancel Subscription
const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await stripe.subscriptions.cancel(subscriptionId);

    res.json({
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    res.status(500).json({ error: "Error canceling subscription" });
  }
};

// Register routes
app.post("/stripe/customers", createCustomer);
app.get("/stripe/customers/:customerId", getCustomer);
app.post("/stripe/payments", createPaymentIntent);
app.post("/stripe/payments/:paymentIntentId/retry", retryPayment);
app.post("/stripe/subscriptions", createSubscription);
app.get("/stripe/subscriptions/:subscriptionId", getSubscriptionStatus);
app.delete("/stripe/subscriptions/:subscriptionId", cancelSubscription);
app.post("/sendPurchaseConfirmation", sendPurchaseConfirmationHandler);

// Export the Express app as a Firebase Cloud Function
export const api = functions.https.onRequest(app);
