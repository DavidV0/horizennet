import { onCall } from 'firebase-functions/v2/https';
import { PurchaseConfirmationData } from '../types';
import * as admin from 'firebase-admin';
import { stripe } from '../config/stripe';
import { config } from '../config';
import * as nodemailer from 'nodemailer';

interface EmailAttachment {
  filename: string;
  content?: Buffer;
  path?: string;
}

// Initialize nodemailer transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  name: config.email.name,
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
  tls: config.email.tls
});

// Verify transporter connection
transporter.verify(function(error, success) {
  if (error) {
    console.error('Transporter verification error:', error);
  } else {
    console.log('Transporter is ready to send emails');
  }
});

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
    purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
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

  await admin.firestore().collection('productKeys').doc(productKey).set(productKeyData);
  return productKeyData;
};

// Send purchase confirmation
export const sendPurchaseConfirmation = onCall<PurchaseConfirmationData>({
  timeoutSeconds: 300,
  memory: '256MiB',
  minInstances: 0,
  maxInstances: 10,
  cors: config.cors.origins
}, async (request) => {
  try {
    const data = request.data;
    console.log('Received purchase confirmation request with data:', JSON.stringify(data, null, 2));
    
    // Validate required fields
    if (!data.email || !data.firstName || !data.lastName || !data.orderId) {
      console.error('Missing required fields in request data');
      return { success: false, error: 'Missing required fields' };
    }

    // Generate product key first
    try {
      const productKey = await generateProductKey();
      console.log('Generated product key:', productKey);
      
      // Store customer data with the product key
      try {
        await storeInitialProductKey(productKey, data);
        console.log('Successfully stored initial product key data');
      } catch (storeError) {
        console.error('Error storing product key:', storeError);
        return { success: false, error: 'Failed to store product key', details: storeError };
      }

      // Prepare attachments array
      const attachments: EmailAttachment[] = [];

      // Try to get invoice if it's a one-time payment
      if (!data.isSubscription && data.orderId) {
        try {
          console.log('Attempting to get invoice for one-time payment, orderId:', data.orderId);
          const paymentIntent = await stripe.paymentIntents.retrieve(data.orderId);
          console.log('Retrieved payment intent:', paymentIntent.id);
          
          if (paymentIntent.metadata?.invoice_id) {
            const invoice = await stripe.invoices.retrieve(paymentIntent.metadata.invoice_id);
            console.log('Retrieved invoice:', invoice.id);

            if (invoice.invoice_pdf) {
              attachments.push({
                filename: 'rechnung.pdf',
                path: invoice.invoice_pdf
              });
              console.log('Added invoice PDF to attachments');
            }
          }
        } catch (error) {
          console.warn('Error getting invoice:', error);
        }
      } else if (data.isSubscription && data.orderId) {
        try {
          console.log('Attempting to get invoice for subscription, subscriptionId:', data.orderId);
          const subscription = await stripe.subscriptions.retrieve(data.orderId);
          console.log('Retrieved subscription:', subscription.id);

          const latestInvoice = await stripe.invoices.retrieve(subscription.latest_invoice as string);
          console.log('Retrieved latest invoice:', latestInvoice.id);

          if (latestInvoice && latestInvoice.invoice_pdf) {
            attachments.push({
              filename: 'rechnung.pdf',
              path: latestInvoice.invoice_pdf
            });
            console.log('Added subscription invoice PDF to attachments');
          }
        } catch (error) {
          console.warn('Error getting subscription invoice:', error);
        }
      }

      // Get additional attachments from storage
      try {
        console.log('Getting additional attachments from storage');
        const bucket = admin.storage().bucket();
        
        // Try to get AGB
        try {
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
          const [widerrufFile] = await bucket.file('documents/widerrufsbelehrung.pdf').download();
          attachments.push({
            filename: 'widerrufsbelehrung.pdf',
            content: widerrufFile
          });
          console.log('Successfully added Widerruf to attachments');
        } catch (error) {
          console.warn('Widerruf file not found:', error);
        }

        // Check if user is sales partner
        if (data.isSalesPartner) {
          try {
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
      }

      // Send email with all attachments
      try {
        console.log('Preparing to send email with attachments:', attachments.map(a => a.filename));
        const emailResult = await transporter.sendMail({
          from: `"HorizonNet Consulting" <${process.env.EMAIL_USER || 'office@horizonnet-consulting.at'}>`,
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
              ${data.isSalesPartner ? '<li>Vertriebspartnervertrag (bitte unterschrieben zurücksenden)</li>' : ''}
            </ul>
            <p><strong>Ihr Produktschlüssel: ${productKey}</strong></p>
            <p>Um Ihren Zugang zu aktivieren, klicken Sie bitte auf folgenden Link:</p>
            <p><a href="${config.baseUrl}/activate?key=${productKey}">Zugang aktivieren</a></p>
            <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
            <p>Mit freundlichen Grüßen<br>Ihr HorizonNet Team</p>
          `,
          attachments
        });
        console.log('Email sent successfully:', emailResult);
        return { success: true, productKey };
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        return { success: false, error: 'Failed to send email', details: emailError };
      }
    } catch (error) {
      console.error('Error generating product key:', error);
      return { success: false, error: 'Failed to generate product key', details: error };
    }
  } catch (error: unknown) {
    console.error('Error in purchase confirmation handler:', error);
    return { 
      success: false, 
      error: 'Failed to send purchase confirmation', 
      details: error instanceof Error ? error.message : String(error) 
    };
  }
}); 