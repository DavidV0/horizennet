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

interface StripeRequest extends Request {
  rawBody?: Buffer;
}

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'horizonnet-ed13d',
    storageBucket: 'horizonnet-ed13d.firebasestorage.app',
    credential: admin.credential.applicationDefault()
  });
}

// Ensure we're using production email settings in emulator
process.env.FUNCTIONS_EMULATOR = "false";

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
    console.log('Received purchase confirmation data:', {
      email: data.email,
      purchasedCourseIds: data.purchasedCourseIds,
      isSalesPartner: data.isSalesPartner
    });
    const attachments: EmailAttachment[] = [];
    const bucket = admin.storage().bucket();
    
    try {
      // Get product names for purchased courses first
      console.log('Received data:', {
        email: data.email,
        purchasedCourseIds: data.purchasedCourseIds,
        isSalesPartner: data.isSalesPartner
      });

      // Debug: Log the Firestore query
      const productsRef = admin.firestore().collection('shop-products');
      console.log('Querying Firestore collection:', 'shop-products');
      
      // First get all products to see what's available
      const allProducts = await productsRef.get();
      console.log('All available products:', allProducts.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        courseIds: doc.data().courseIds
      })));

      // Suche nach Produkten basierend auf den gekauften Kurs-IDs
      const purchasedProducts = allProducts.docs.filter(doc => {
        const productData = doc.data();
        return data.purchasedCourseIds.some(courseId => 
          productData.courseIds && productData.courseIds.includes(courseId)
        );
      });

      // Prüfe ob HORIZON Academy dabei ist (case-insensitive)
      const hasAcademy = purchasedProducts.some(doc => 
        doc.data().name.toLowerCase() === 'horizon academy'.toLowerCase()
      );

      console.log('Found purchased products:', purchasedProducts.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        courseIds: doc.data().courseIds
      })));

      console.log('Has HORIZON Academy:', hasAcademy);
      console.log('Is Sales Partner:', data.isSalesPartner);
      console.log('Products in cart:', purchasedProducts.map(doc => doc.data().name));

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
      if (hasAcademy && data.isSalesPartner) {
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

      // Generate product key
      const productKey = await generateProductKey();
      await storeInitialProductKey(productKey, data);

      // Generate and send email
      const emailHtml = `
        <h1>Vielen Dank für Ihre Bestellung!</h1>
        <p>Sehr geehrte(r) ${data.firstName} ${data.lastName},</p>
        <p>vielen Dank für Ihre Bestellung bei HorizonNet. Im Anhang finden Sie:</p>
        <ul>
          ${!data.isSubscription ? '<li>Ihre Rechnung</li>' : ''}
          <li>Unsere AGB</li>
          <li>Datenschutzerklärung</li>
          <li>Widerrufsbelehrung</li>
          ${hasAcademy && data.isSalesPartner ? '<li>Vertriebspartnervertrag (bitte unterschrieben zurücksenden)</li>' : ''}
        </ul>
        <p><strong>Ihr Produktschlüssel: ${productKey}</strong></p>
        <p>Um Ihren Zugang zu aktivieren, klicken Sie bitte auf folgenden Link:</p>
        <p><a href="${BASE_URL}/activate?key=${productKey}">Zugang aktivieren</a></p>
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        <p>Mit freundlichen Grüßen<br>Ihr HorizonNet Team</p>
      `;

      console.log('Preparing to send email with attachments:', attachments.map(a => a.filename));
      const emailResult = await transporter.sendMail({
        from: {
          name: "HorizonNet Consulting",
          address: process.env.EMAIL_USER || ''
        },
        to: data.email,
        subject: 'Ihre Bestellung bei HorizonNet',
        html: emailHtml,
        text: emailHtml.replace(/<[^>]*>/g, ''),
        attachments: attachments.map(attachment => ({
          ...attachment,
          contentType: 'application/pdf',
          contentDisposition: 'attachment'
        })),
        headers: {
          'List-Unsubscribe': `<mailto:${process.env.EMAIL_USER}>`,
          'Feedback-ID': `purchase:horizonnet:${data.orderId}`,
          'X-Entity-Ref-ID': data.orderId
        }
      });

      console.log('Email sent successfully:', emailResult);
      return res.json({ success: true, productKey });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return res.status(500).json({ error: 'Failed to send email', details: emailError });
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

// Configure body-parser for raw bodies
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Mount the router with /api prefix
app.use('/api', router);

// Register webhook route on router
router.post("/webhook", express.raw({type: 'application/json'}), async (req: StripeRequest, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 
      (functions.config().stripe?.webhook_secret as string) || 
      '';
    const event = stripe.webhooks.constructEvent(req.rawBody || '', sig, webhookSecret);

    if (event.type.startsWith('invoice.') || event.type.startsWith('customer.subscription.')) {
      await handleSubscriptionWebhook(event);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Health check endpoint
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

// Initialize nodemailer transporter
const transporter = nodemailer.createTransport({
  host: "w01ef01f.kasserver.com",
  port: 587,
  secure: false,
  name: process.env.EMAIL_NAME,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  },
  pool: true,
  maxConnections: 1,
  rateDelta: 20000,
  rateLimit: 5
});

// Verify transporter
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

// Customer Management Handlers
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

const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, currency = "eur", customer, payment_method } = req.body;
    
    console.log('Received payment intent request:', { amount, currency, customer, payment_method });

    if (!amount || !customer || !payment_method) {
      console.error('Missing required fields:', { amount, customer, payment_method });
      res.status(400).json({ error: "Amount, customer and payment_method are required" });
      return;
    }

    try {
      // Create payment intent first
      console.log('Creating payment intent');
      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(amount), // amount should already be in cents
        currency,
        customer,
        payment_method,
        confirmation_method: 'automatic',
        capture_method: 'automatic' as const,
        setup_future_usage: 'off_session'
      };

      console.log('Payment intent data:', paymentIntentData);
      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
      console.log('Created payment intent:', paymentIntent.id);

      // Create an invoice after successful payment intent creation
      console.log('Creating invoice for customer:', customer);
      const invoice = await stripe.invoices.create({
        customer,
        auto_advance: true,
        collection_method: 'charge_automatically',
        pending_invoice_items_behavior: 'include'
      });

      console.log('Created invoice:', invoice.id);

      // Add invoice item
      console.log('Adding invoice item:', { amount, currency });
      await stripe.invoiceItems.create({
        customer,
        amount: Math.round(amount),
        currency,
        description: 'HorizonNet Produkt',
        invoice: invoice.id
      });

      // Update payment intent with invoice metadata
      await stripe.paymentIntents.update(paymentIntent.id, {
        metadata: {
          invoice_id: invoice.id
        }
      });

      // Finalize invoice
      console.log('Finalizing invoice:', invoice.id);
      await stripe.invoices.finalizeInvoice(invoice.id);

      res.json({
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id,
        status: paymentIntent.status,
        invoice_id: invoice.id
      });
    } catch (stripeError) {
      console.error('Stripe API Error:', stripeError);
      res.status(400).json({
        error: 'Stripe API Error',
        details: stripeError instanceof Error ? stripeError.message : String(stripeError)
      });
    }
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ 
      error: "Error creating payment intent",
      details: error instanceof Error ? error.message : String(error)
    });
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

// Get payment intent handler
const getPaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentIntentId } = req.params;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    res.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Error getting payment intent:', error);
    res.status(500).json({ error: 'Failed to get payment intent' });
  }
};

// Setup intent handler
const createSetupIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customer, payment_method } = req.body;
    
    if (!customer || !payment_method) {
      res.status(400).json({ error: "Customer and payment_method are required" });
      return;
    }

    const setupIntent = await stripe.setupIntents.create({
      customer,
      payment_method,
      payment_method_types: ['card'],
      usage: 'off_session'
    });

    res.json({
      client_secret: setupIntent.client_secret,
      id: setupIntent.id,
      status: setupIntent.status
    });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    res.status(500).json({ error: 'Failed to create setup intent' });
  }
};

// Register all routes on router instead of app
router.post("/stripe/customers", createCustomer);
router.get("/stripe/customers/:customerId", getCustomer);
router.post("/stripe/payments", createPaymentIntent);
router.get("/stripe/payments/:paymentIntentId", getPaymentIntent);
router.post("/stripe/payments/:paymentIntentId/retry", retryPayment);
router.post("/stripe/subscriptions", createSubscription);
router.get("/stripe/subscriptions/:subscriptionId", getSubscriptionStatus);
router.delete("/stripe/subscriptions/:subscriptionId", cancelSubscription);
router.post("/stripe/subscriptions/:subscriptionId/handle-failed-payment", handleFailedPayment);
router.post("/stripe/subscriptions/:subscriptionId/reminder", sendRenewalReminder);
router.post("/stripe/subscriptions/:subscriptionId/payment-method", updatePaymentMethod);
router.post("/stripe/setup-intent", createSetupIntent);

// Register purchase confirmation route
router.post("/purchase-confirmation", async (req: Request, res: Response) => {
  await sendPurchaseConfirmationHandler(req, res);
});

// Register contact form route
router.post('/sendContactForm', async (req: Request, res: Response) => {
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

    // Send email to admin
    await transporter.sendMail({
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

    // Send confirmation email to user
    await transporter.sendMail({
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

    // Store in Firestore
    await admin.firestore().collection('contactRequests').add({
      ...data,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'new'
    });

    res.status(200).json({ success: true });
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
  purchasedCourseIds: string[];
  purchasedProducts: {
    id: string;
    name: string;
    courseIds: string[];
  }[];
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
const generateProductKey = async (): Promise<string> => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `HN-${timestamp}-${random}`;
};

// Store initial product key in Firestore
const storeInitialProductKey = async (productKey: string, data: PurchaseConfirmationData) => {
  const productKeyData = {
    productKey,
    customerEmail: data.email,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    street: data.billingDetails.street,
    streetNumber: data.billingDetails.streetNumber,
    zipCode: data.billingDetails.zipCode,
    city: data.billingDetails.city,
    country: data.billingDetails.country,
    paymentPlan: data.paymentPlan,
    purchaseDate: new Date(),
    createdAt: new Date(),
    isActivated: false,
    isSalesPartner: data.isSalesPartner || false,
    courseIds: data.purchasedCourseIds,
    products: data.purchasedProducts.reduce((acc, product) => ({
      ...acc,
      [product.id]: {
        name: product.name,
        courseIds: product.courseIds,
        activated: false,
        activatedAt: null
      }
    }), {}),
    status: 'active'
  };

  // Store in Firestore
  await admin.firestore().collection('productKeys').doc(productKey).set(productKeyData);

  return productKeyData;
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
  try {
    const { email, password, firstName, lastName } = request.data;
    
    // Sende Aktivierungs-E-Mail
    await transporter.sendMail({
      from: '"HorizonNet Consulting" <office@horizonnet-consulting.at>',
      to: email,
      subject: "Ihr Account wurde aktiviert",
      html: `
        <h1>Ihr Account wurde erfolgreich aktiviert!</h1>
        <p>Hallo ${firstName || ''} ${lastName || ''}</p>
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

    return { success: true };
  } catch (error) {
    console.error('Error in activation:', error);
    return { error: 'Failed to activate products' };
  }
});

interface ConsentData {
  acceptTerms: boolean;
  consent1: boolean;
  consent2: boolean;
  timestamp: string;
}

const checkIfUserExists = async (email: string): Promise<boolean> => {
  const usersSnapshot = await admin.firestore()
    .collection('users')
    .where('email', '==', email)
    .get();
  return !usersSnapshot.empty;
};

const activateProductKey = async (productKey: string, consent: ConsentData) => {
  if (!consent.acceptTerms || !consent.consent1 || !consent.consent2) {
    throw new Error('Alle Zustimmungen müssen akzeptiert werden');
  }

  try {
    // Check if product key exists and is valid
    const keyDoc = await admin.firestore().collection('productKeys').doc(productKey).get();
    if (!keyDoc?.exists) {
      throw new Error('Invalid product key');
    }

    const keyData = keyDoc.data() as any;
    
    if (keyData.isActivated) {
      throw new Error('Dieser Produktschlüssel wurde bereits aktiviert.');
    }

    // Check for email in customerEmail field first, then fall back to email field
    const email = keyData.customerEmail || keyData.email;
    
    if (!email) {
      throw new Error('Keine E-Mail-Adresse für diesen Produktschlüssel gefunden.');
    }

    // Generate password and create or get Firebase Auth user
    const password = Math.random().toString(36).slice(-8);
    let user;
    let isNewUser = true;

    try {
      // Versuche zuerst, den Benutzer zu erstellen
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        emailVerified: false
      });
      user = userRecord;
    } catch (authError: any) {
      isNewUser = false;
      if (authError.code === 'auth/email-already-exists') {
        // Prüfe ob der Benutzer in unserer Datenbank existiert
        const existingUser = await checkIfUserExists(email);
        if (existingUser) {
          throw new Error('Diese E-Mail-Adresse wurde bereits aktiviert. Bitte verwenden Sie die Anmeldedaten aus Ihrer Aktivierungs-E-Mail.');
        }
        
        // Wenn der Benutzer nur in Auth existiert, hole die User-Daten
        const userRecord = await admin.auth().getUserByEmail(email);
        user = userRecord;
      } else {
        throw authError;
      }
    }

    if (!user) {
      throw new Error('Failed to create or get user account');
    }

    // Create user document with consent data and course IDs
    const userData = {
      firstName: keyData.firstName || '',
      lastName: keyData.lastName || '',
      email: email,
      street: keyData.street || '',
      streetNumber: keyData.streetNumber || '',
      zipCode: keyData.zipCode || '',
      city: keyData.city || '',
      country: keyData.country || '',
      mobile: keyData.mobile || '',
      paymentPlan: keyData.paymentPlan || 0,
      purchaseDate: keyData.purchaseDate || new Date(),
      productKey: productKey,
      status: 'active',
      keyActivated: true,
      accountActivated: false,
      firebaseUid: user.uid,
      activatedAt: new Date(),
      consent: {
        acceptTerms: consent.acceptTerms,
        consent1: consent.consent1,
        consent2: consent.consent2,
        timestamp: consent.timestamp
      },
      courses: {
        purchased: keyData.courseIds,
        progress: {}
      },
      products: keyData.products || {},
      isSalesPartner: keyData.isSalesPartner || false
    };

    // Create user document
    await admin.firestore().collection('users').doc(user.uid).set(userData);

    // Update product key status with consent data
    await admin.firestore().collection('productKeys').doc(productKey).update({
      status: 'active',
      isActivated: true,
      activatedAt: new Date(),
      firebaseUid: user.uid,
      email: email,
      consent: {
        acceptTerms: consent.acceptTerms,
        consent1: consent.consent1,
        consent2: consent.consent2,
        timestamp: consent.timestamp
      }
    });

    // Send confirmation email with login credentials only if new user was created
    if (isNewUser) {
      try {
        const productValues = keyData.products && typeof keyData.products === 'object' 
          ? Object.values(keyData.products) as ProductData[]
          : [];
          
        if (productValues.length === 0) {
          throw new Error('Keine Produkte für diesen Benutzer gefunden');
        }

        // E-Mail direkt senden
        await transporter.sendMail({
          from: '"HorizonNet Consulting" <office@horizonnet-consulting.at>',
          to: email,
          subject: "Ihr Account wurde aktiviert",
          html: `
            <h1>Ihr Account wurde erfolgreich aktiviert!</h1>
            <p>Hallo ${keyData.firstName || ''} ${keyData.lastName || ''}</p>
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
      } catch (error: any) {
        console.error('Error sending activation email:', error);
      }
    }

    return user;
  } catch (error) {
    throw error;
  }
};

interface ProductData {
  name: string;
  courseIds: string[];
  activated: boolean;
  activatedAt: Date | null;
}

// Export the activateProduct function
export const activateProduct = onCall<{productKey: string, consent: ConsentData}>({
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
  try {
    const { productKey, consent } = request.data;
    const user = await activateProductKey(productKey, consent);
    return { success: true, user };
  } catch (error) {
    console.error('Error in product activation:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to activate product' 
    };
  }
});