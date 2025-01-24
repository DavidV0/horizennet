import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { onCall } from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import express, { Request, Response, Router } from "express";
import cors from "cors";
import Stripe from "stripe";
import * as dotenv from "dotenv";
import * as nodemailer from "nodemailer";

// Imports bleiben gleich...

// Das Interface wird verwendet, also TypeScript-Fehler ignorieren
/* eslint-disable @typescript-eslint/no-unused-vars */
interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  privacyPolicy: boolean;
  timestamp: Date;
}

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

interface ExtendedRequest extends Request {
  params: {
    subscriptionId: string;
  };
  body: {
    gracePeriodDays?: number;
    paymentMethodId?: string;
  };
}

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Add this helper function at the top of the file
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Send purchase confirmation email
const sendPurchaseConfirmationHandler = async (req: Request, res: Response) => {
  try {
    const data = req.body as PurchaseConfirmationData;
    console.log('Received purchase confirmation request with data:', JSON.stringify(data, null, 2));
    
    // Validate required fields
    if (!data.email || !data.firstName || !data.lastName || !data.orderId) {
      console.error('Missing required fields in request data');
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Generate product key first
    try {
      const productKey = await generateProductKey(data.productType || 'crypto');
      console.log('Generated product key:', productKey);
      
      // Store customer data with the product key
      try {
        await storeInitialProductKey(productKey, data);
        console.log('Successfully stored initial product key data');
      } catch (storeError) {
        console.error('Error storing product key:', storeError);
        return res.status(500).json({ error: 'Failed to store product key', details: storeError });
      }
      
      // Prepare attachments array
      const attachments: EmailAttachment[] = [];

      // Try to get invoice if it's a one-time payment
      if (!data.isSubscription && data.orderId) {
        try {
          console.log('Attempting to get invoice for one-time payment, orderId:', data.orderId);
          // Get the payment intent to find the invoice
          const paymentIntent = await stripe.paymentIntents.retrieve(data.orderId);
          console.log('Retrieved payment intent:', paymentIntent.id);
          
          if (paymentIntent.metadata?.invoice_id) {
            const invoice = await stripe.invoices.retrieve(paymentIntent.metadata.invoice_id);
            console.log('Retrieved invoice:', invoice.id);

            // Add invoice URL if available
            if (invoice.invoice_pdf) {
              attachments.push({
                filename: 'rechnung.pdf',
                path: invoice.invoice_pdf
              });
              console.log('Added invoice PDF to attachments');
            }
          } else {
            console.log('No invoice ID found in payment intent metadata');
          }
        } catch (error) {
          console.warn('Error getting invoice:', error);
          // Continue without invoice
        }
      } else if (data.isSubscription && data.orderId) {
        try {
          console.log('Attempting to get invoice for subscription, subscriptionId:', data.orderId);
          // For subscriptions, get the subscription first to find the latest invoice
          const subscription = await stripe.subscriptions.retrieve(data.orderId);
          console.log('Retrieved subscription:', subscription.id);

          // Get the latest invoice for this subscription
          const latestInvoice = await stripe.invoices.retrieve(subscription.latest_invoice as string);
          console.log('Retrieved latest invoice:', latestInvoice.id);

          if (latestInvoice && latestInvoice.invoice_pdf) {
            attachments.push({
              filename: 'rechnung.pdf',
              path: latestInvoice.invoice_pdf
            });
            console.log('Added subscription invoice PDF to attachments');
          } else {
            console.log('No invoice PDF found in latest invoice');
          }
        } catch (error) {
          console.warn('Error getting subscription invoice:', error);
          // Continue without invoice
        }
      } else {
        console.log('No orderId provided or invalid payment type');
      }

      // Try to get additional attachments from storage
      try {
        console.log('Getting additional attachments from storage');
        const bucket = admin.storage().bucket();
        
        // Try to get AGB
        try {
          console.log('Attempting to download AGB');
          const [agbFile] = await bucket.file('documents/agb.pdf').download();
          attachments.push({
            filename: 'agb.pdf',
            content: agbFile
          });
          console.log('Successfully added AGB to attachments');
        } catch (error) {
          console.warn('AGB file not found:', error);
        }

        // Try to get Datenschutz
        try {
          console.log('Attempting to download Datenschutz');
          const [datenschutzFile] = await bucket.file('documents/datenschutz.pdf').download();
          attachments.push({
            filename: 'datenschutz.pdf',
            content: datenschutzFile
          });
          console.log('Successfully added Datenschutz to attachments');
        } catch (error) {
          console.warn('Datenschutz file not found:', error);
        }

        // Try to get Widerruf
        try {
          console.log('Attempting to download Widerruf');
          const [widerrufFile] = await bucket.file('documents/widerrufsbelehrung.pdf').download();
          attachments.push({
            filename: 'widerrufsbelehrung.pdf',
            content: widerrufFile
          });
          console.log('Successfully added Widerruf to attachments');
        } catch (error) {
          console.warn('Widerruf file not found:', error);
        }

        // Try to get sales partner agreement if applicable
        if (data.productType === 'academy' && data.isSalesPartner) {
          try {
            console.log('Attempting to download Vertriebspartnervertrag');
            const [vertragFile] = await bucket.file('documents/vertriebspartnervertrag.pdf').download();
            attachments.push({
              filename: 'vertriebspartnervertrag.pdf',
              content: vertragFile
            });
            console.log('Successfully added Vertriebspartnervertrag to attachments');
          } catch (error) {
            console.warn('Vertriebspartnervertrag file not found:', error);
          }
        }
      } catch (error) {
        console.error('Error getting attachments from storage:', error);
        // Continue without attachments
      }

      // Send email with all attachments
      try {
        console.log('Preparing to send email with attachments:', attachments.map(a => a.filename));
        const emailResult = await transporter.sendMail({
          from: `"HorizonNet Consulting" <${process.env.EMAIL_USER || functions.config().email.user}>`,
          to: data.email,
          subject: 'Ihre Bestellung bei HorizonNet',
          html: `
            <h1>Vielen Dank für Ihre Bestellung!</h1>
            <p>Sehr geehrte(r) ${data.firstName} ${data.lastName},</p>
            <p>vielen Dank für Ihre Bestellung bei HorizonNet. Im Anhang finden Sie:</p>
            <ul>
              ${!data.isSubscription ? '<li>Ihre Rechnung</li>' : ''}
              <li>Unsere AGB</li>
              <li>Datenschutzerklärung</li>
              <li>Widerrufsbelehrung</li>
              ${data.productType === 'academy' && data.isSalesPartner ? '<li>Vertriebspartnervertrag (bitte unterschrieben zurücksenden)</li>' : ''}
            </ul>
            <p><strong>Ihr Produktschlüssel: ${productKey}</strong></p>
            <p>Um Ihren Zugang zu aktivieren, klicken Sie bitte auf folgenden Link:</p>
            <p><a href="${BASE_URL}/activate?key=${productKey}">Zugang aktivieren</a></p>
            <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
            <p>Mit freundlichen Grüßen<br>Ihr HorizonNet Team</p>
          `,
          attachments
        });
        console.log('Email sent successfully:', emailResult);
        return res.json({ success: true, productKey });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        return res.status(500).json({ error: 'Failed to send email', details: emailError });
      }
    } catch (error) {
      console.error('Error generating product key:', error);
      return res.status(500).json({ error: 'Failed to generate product key', details: error });
    }
  } catch (error: unknown) {
    console.error('Error in purchase confirmation handler:', error);
    return res.status(500).json({ 
      error: 'Failed to send purchase confirmation', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
};

// Initialize Express app
const app: express.Application = express();
const router: Router = express.Router();
const corsOptions = {
  origin: [
    'https://horizonnet-ed13d.web.app',
    'https://horizonnet-consulting.at',
    'http://localhost:4200'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint for Cloud Run
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// Initialize Stripe with the latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || functions.config().stripe.secret_key || '', {
  apiVersion: '2024-12-18.acacia'
});

// Log the key being used (masked)
const stripeKey = process.env.STRIPE_SECRET_KEY || functions.config().stripe.secret_key || '';
console.log('Using Stripe key:', stripeKey ? stripeKey.substring(0, 8) + '...' : 'No key found');

// Nodemailer Transport
const transporter = nodemailer.createTransport({
  host: "w01ef01f.kasserver.com",
  port: 587,
  secure: false,
  name: 'm07462fe',
  auth: {
    user: 'office@horizonnet-consulting.at',
    pass: process.env.EMAIL_PASSWORD || functions.config().email.password,
  },
  tls: {
    rejectUnauthorized: false
  }
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

// Email sending function
const sendEmail = async (options: EmailOptions): Promise<void> => {
  // Implementation remains the same
};

// Handler declarations
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

const handleFailedPayment = async (req: ExtendedRequest, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { gracePeriodDays = 7 } = req.body;
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
    
    // Send email notification
    await sendEmail({
      to: customer.email!,
      subject: 'Payment Failed - Action Required',
      template: 'payment-failed',
      data: {
        customerName: customer.name || 'Valued Customer',
        gracePeriodDays,
        subscriptionId
      }
    });
    
    // Set grace period end date
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

    // Update subscription metadata with grace period
    await stripe.subscriptions.update(subscriptionId, {
      metadata: {
        gracePeriodEnd: gracePeriodEnd.getTime().toString()
      }
    });

    res.json({
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      gracePeriodEnd: gracePeriodEnd.getTime()
    });
  } catch (error: any) {
    console.error('Error handling failed payment:', error);
    res.status(500).json({ error: error.message });
  }
};

const sendRenewalReminder = async (req: ExtendedRequest, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
    
    // Send email notification
    await sendEmail({
      to: customer.email!,
      subject: 'Subscription Renewal Reminder',
      template: 'renewal-reminder',
      data: {
        customerName: customer.name || 'Valued Customer',
        subscriptionId,
        renewalDate: new Date(subscription.current_period_end * 1000).toLocaleDateString()
      }
    });
    
    // Update subscription metadata with last notification date
    await stripe.subscriptions.update(subscriptionId, {
      metadata: {
        lastNotificationSent: new Date().toISOString()
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error sending renewal reminder:', error);
    res.status(500).json({ error: error.message });
  }
};

const updatePaymentMethod = async (req: ExtendedRequest, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { paymentMethodId } = req.body;
    
    if (!paymentMethodId) {
      throw new Error('Payment method ID is required');
    }
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Attach new payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: subscription.customer as string,
    });

    // Update subscription's default payment method
    await stripe.subscriptions.update(subscriptionId, {
      default_payment_method: paymentMethodId
    });

    // If subscription is past_due, try to pay the latest invoice
    if (subscription.status === 'past_due') {
      const latestInvoice = await stripe.invoices.retrieve(subscription.latest_invoice as string);
      if (latestInvoice.status === 'open') {
        await stripe.invoices.pay(latestInvoice.id, {
          payment_method: paymentMethodId
        });
      }
    }

    res.json({
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end
    });
  } catch (error: any) {
    console.error('Error updating payment method:', error);
    res.status(500).json({ error: error.message });
  }
};

const handleSubscriptionWebhook = async (event: Stripe.Event) => {
  try {
    switch (event.type) {
      case 'invoice.payment_failed': {
        const invoiceObject = event.data.object as Stripe.Invoice;
        if (invoiceObject.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoiceObject.subscription as string);
          await handleFailedPayment({
            params: { subscriptionId: subscription.id },
            body: { gracePeriodDays: 7 }
          } as ExtendedRequest, {} as Response);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const updatedSubscription = event.data.object as Stripe.Subscription;
        // Check if subscription is about to renew
        const daysUntilRenewal = Math.ceil((updatedSubscription.current_period_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
        if ([7, 3, 1].includes(daysUntilRenewal)) {
          await sendRenewalReminder({
            params: { subscriptionId: updatedSubscription.id }
          } as ExtendedRequest, {} as Response);
        }
        break;
      }
    }
  } catch (error) {
    console.error("Error handling subscription webhook:", error);
  }
};

// Mount the router with /api prefix
app.use('/api', router);

// Register all routes
router.post("/sendPurchaseConfirmation", async (req: Request, res: Response) => {
  await sendPurchaseConfirmationHandler(req, res);
});

router.post("/stripe/customers", createCustomer);
router.get("/stripe/customers/:customerId", getCustomer);
router.post("/stripe/payments", createPaymentIntent);
router.post("/stripe/payments/:paymentIntentId/retry", retryPayment);
router.post("/stripe/subscriptions", createSubscription);
router.get("/stripe/subscriptions/:subscriptionId", getSubscriptionStatus);
router.delete("/stripe/subscriptions/:subscriptionId", cancelSubscription);
router.post("/stripe/subscriptions/:subscriptionId/handle-failed-payment", handleFailedPayment);
router.post("/stripe/subscriptions/:subscriptionId/reminder", sendRenewalReminder);
router.post("/stripe/subscriptions/:subscriptionId/payment-method", updatePaymentMethod);
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe.webhook_secret;
    const event = stripe.webhooks.constructEvent(req.body, sig!, webhookSecret);

    if (event.type.startsWith('invoice.') || event.type.startsWith('customer.subscription.')) {
      await handleSubscriptionWebhook(event);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Die sendContactForm Funktion als Express-Route
router.post('/sendContactForm', async (req: Request, res: Response) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const data = req.body as ContactFormData;
    console.log('Received contact form data:', data);
    
    // Validate input data
    if (!data.firstName || !data.lastName || !data.email || !data.message) {
      console.log('Missing required fields:', { data });
      res.status(400).json({
        error: 'Alle Pflichtfelder müssen ausgefüllt sein.'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      console.log('Invalid email format:', data.email);
      res.status(400).json({
        error: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
      });
      return;
    }

    try {
      // Send email to admin
      console.log('Sending email to admin...');
      const adminMailResult = await transporter.sendMail({
        from: '"HorizonNet Kontaktformular" <office@horizonnet-consulting.at>',
        to: 'office@horizonnet-consulting.at',
        subject: 'Neue Kontaktanfrage',
        html: `
          <h2>Neue Kontaktanfrage von ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</h2>
          <p><strong>Name:</strong> ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</p>
          <p><strong>E-Mail:</strong> ${escapeHtml(data.email)}</p>
          <p><strong>Nachricht:</strong></p>
          <p>${escapeHtml(data.message)}</p>
          <p><strong>Zeitpunkt:</strong> ${new Date().toLocaleString('de-AT')}</p>
        `
      });
      console.log('Admin email sent:', adminMailResult);

      // Send confirmation email to user
      console.log('Sending confirmation email to user...');
      const userMailResult = await transporter.sendMail({
        from: '"HorizonNet Consulting" <office@horizonnet-consulting.at>',
        to: data.email,
        subject: 'Ihre Kontaktanfrage bei HorizonNet',
        html: `
          <h2>Vielen Dank für Ihre Kontaktanfrage!</h2>
          <p>Sehr geehrte(r) ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)},</p>
          <p>wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>
          <p>Ihre Nachricht:</p>
          <blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin: 10px 0;">
            ${escapeHtml(data.message)}
          </blockquote>
          <p>Mit freundlichen Grüßen,<br>Ihr HorizonNet Team</p>
        `
      });
      console.log('User confirmation email sent:', userMailResult);

      // Store in Firestore
      console.log('Storing contact request in Firestore...');
      await admin.firestore().collection('contactRequests').add({
        ...data,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'new'
      });
      console.log('Contact request stored in Firestore');

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Detailed error in sendContactForm:', error);
      res.status(500).json({
        error: 'Ein Fehler ist aufgetreten beim Verarbeiten Ihrer Anfrage.',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error('Error in sendContactForm:', error);
    res.status(500).json({
      error: 'Ein unerwarteter Fehler ist aufgetreten.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export the Express app wrapped in functions.https.onRequest
export const api = onRequest({
  timeoutSeconds: 300,
  memory: '256MiB',
  minInstances: 0,
  maxInstances: 10,
  cors: true
}, app);

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
  isSubscription?: boolean;
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

// Send activation confirmation
export const sendActivationConfirmation = onCall<ActivationConfirmationData>({
  timeoutSeconds: 300,
  memory: '256MiB',
  minInstances: 0,
  maxInstances: 10,
  cors: [
    'https://horizonnet-ed13d.web.app',
    'https://horizonnet-consulting.at',
    'http://localhost:4200'
  ]
}, async (request) => {
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
      from: '"HorizonNet Consulting" <office@horizonnet-consulting.at>',
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
        <p>Mit freundlichen Grüßen,<br>Ihr HorizonNet Team</p>
      `
    });

    console.log('Activation confirmation email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending activation confirmation:', error);
    return { error: 'Failed to send activation confirmation' };
  }
});