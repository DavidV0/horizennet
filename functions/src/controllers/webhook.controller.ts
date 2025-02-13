import { Response } from 'express';
import { StripeRequest, StripeEvent, StripePaymentIntent, StripeInvoice, StripeSubscription, StripeCheckoutSession } from '../types/stripe.types';
import { stripe, stripeService } from '../services/stripe.service';
import { config } from '../config';
import { subscriptionController } from './subscription.controller';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import Stripe from 'stripe';

// Configure Firestore to ignore undefined values
admin.firestore().settings({
  ignoreUndefinedProperties: true
});

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

const sendPurchaseConfirmationEmail = async (confirmationData: any) => {
  try {
    console.log('Starting sendPurchaseConfirmationEmail with data:', JSON.stringify(confirmationData, null, 2));
    
    // Generate product key
    const productKey = await generateProductKey();
    console.log('Generated product key:', productKey);

    // Store product key data
    const productKeyData = {
      productKey,
      customerEmail: confirmationData.email,
      email: confirmationData.email,
      firstName: confirmationData.firstName,
      lastName: confirmationData.lastName,
      street: confirmationData.billingDetails.street,
      streetNumber: confirmationData.billingDetails.streetNumber,
      zipCode: confirmationData.billingDetails.zipCode,
      city: confirmationData.billingDetails.city,
      country: confirmationData.billingDetails.country,
      paymentPlan: confirmationData.paymentPlan,
      purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActivated: false,
      isSalesPartner: confirmationData.isSalesPartner || false,
      courseIds: confirmationData.purchasedCourseIds,
      products: confirmationData.purchasedProducts.reduce((acc: any, product: any) => ({
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

    console.log('Storing product key data:', JSON.stringify(productKeyData, null, 2));
    await admin.firestore().collection('productKeys').doc(productKey).set(productKeyData);
    console.log('Successfully stored product key data');

    // Prepare attachments array
    const attachments: any[] = [];

    // Try to get invoice if it's a one-time payment
    if (!confirmationData.isSubscription && confirmationData.orderId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(confirmationData.orderId);
        if (paymentIntent.metadata?.invoice_id) {
          const invoice = await stripe.invoices.retrieve(paymentIntent.metadata.invoice_id);
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
    } else if (confirmationData.isSubscription && confirmationData.orderId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(confirmationData.orderId);
        const latestInvoice = await stripe.invoices.retrieve(subscription.latest_invoice as string);
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
      if (confirmationData.isSalesPartner) {
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
    const emailResult = await transporter.sendMail({
      from: `"HorizonNet Consulting" <${config.email.user}>`,
      to: confirmationData.email,
      subject: 'Ihre Bestellung bei HorizonNet',
      html: `
        <h1>Vielen Dank für Ihre Bestellung!</h1>
        <p>Sehr geehrte(r) ${confirmationData.firstName} ${confirmationData.lastName},</p>
        <p>vielen Dank für Ihre Bestellung bei HorizonNet. Im Anhang finden Sie:</p>
        <ul>
          ${!confirmationData.isSubscription ? '<li>Ihre Rechnung</li>' : ''}
          <li>Unsere AGB</li>
          <li>Datenschutzerklärung</li>
          <li>Widerrufsbelehrung</li>
          ${confirmationData.isSalesPartner ? '<li>Vertriebspartnervertrag (bitte unterschrieben zurücksenden)</li>' : ''}
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
  } catch (error) {
    console.error('Error sending purchase confirmation email:', error);
    throw error;
  }
};

const storePaymentDetails = async (data: {
  sessionId: string;
  customerId: string;
  customerEmail: string;
  amountPaid: number;
  paymentStatus: string;
  paymentType: 'one_time' | 'subscription';
  metadata?: Record<string, any> | null;
  discountDetails?: {
    couponId?: string;
    couponName?: string;
    discountAmount?: number;
    percentOff?: number;
    amountOff?: number;
  } | null;
  taxDetails?: {
    amount?: number;
    rate?: number;
    country?: string;
  } | null;
  paymentIntentId?: string | null;
  createdAt?: any;
}) => {
  try {
    // First, ensure metadata is defined and has no undefined values
    const rawMetadata = data.metadata || {};
    
    // Clean and validate metadata first
    const cleanMetadata = {
      // Ensure paymentPlan is always a string and never undefined
      paymentPlan: String(rawMetadata.paymentPlan || '0'),
      
      // Clean products array
      products: Array.isArray(rawMetadata.products) 
        ? rawMetadata.products.map((p: any) => ({
            id: p?.id || null,
            name: p?.name || null,
            courseIds: Array.isArray(p?.courseIds) ? p.courseIds.filter(Boolean) : []
          })).filter((p: any) => p.id && p.name)
        : [],
      
      // Clean customer information
      customerName: rawMetadata.customerName || null,
      customerMetadata: rawMetadata.customerMetadata ? JSON.parse(JSON.stringify(rawMetadata.customerMetadata)) : {},
      
      // Clean payment information
      paymentMode: rawMetadata.paymentMode || 'payment',
      originalAmount: typeof rawMetadata.originalAmount === 'number' ? rawMetadata.originalAmount : 0,
      totalAmount: typeof rawMetadata.totalAmount === 'number' ? rawMetadata.totalAmount : 0,
      
      // Clean subscription information if present
      subscriptionId: rawMetadata.subscriptionId || null,
      invoiceNumber: rawMetadata.invoiceNumber || null,
      
      // Clean billing address
      billingAddress: rawMetadata.billingAddress ? {
        line1: rawMetadata.billingAddress.line1 || null,
        city: rawMetadata.billingAddress.city || null,
        postal_code: rawMetadata.billingAddress.postal_code || null,
        country: rawMetadata.billingAddress.country || null
      } : null
    };
    
    // Clean all other fields and ensure no undefined values
    const cleanData = {
      sessionId: data.sessionId,
      customerId: data.customerId,
      customerEmail: data.customerEmail || '',
      amountPaid: data.amountPaid || 0,
      paymentStatus: data.paymentStatus || 'unknown',
      paymentType: data.paymentType,
      metadata: cleanMetadata,
      discountDetails: data.discountDetails ? JSON.parse(JSON.stringify(data.discountDetails)) : null,
      taxDetails: data.taxDetails ? JSON.parse(JSON.stringify(data.taxDetails)) : null,
      paymentIntentId: data.paymentIntentId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Log the final cleaned data for debugging
    console.log('Final data to store:', JSON.stringify(cleanData, (key, value) => 
      value && value.constructor.name === 'FieldValue' ? '[ServerTimestamp]' : value, 2));

    // Store the cleaned data in Firestore
    await admin.firestore()
      .collection('payments')
      .doc(data.sessionId)
      .set(cleanData);
      
    console.log('Payment details stored successfully');
  } catch (error) {
    console.error('Error storing payment details:', error);
    throw error;
  }
};

const getDiscountDetails = async (session: StripeCheckoutSession): Promise<{
  couponId?: string;
  couponName?: string;
  discountAmount?: number;
  percentOff?: number;
  amountOff?: number;
} | null> => {
  try {
    if (!session.total_details?.amount_discount) {
      return null;
    }

    let discountDetails = {
      discountAmount: session.total_details.amount_discount / 100,
    };

    // Get promotion code details if used
    if (session.promotion_code) {
      const promotionCode = await stripe.promotionCodes.retrieve(session.promotion_code);
      const coupon = await stripe.coupons.retrieve(promotionCode.coupon.id);
      
      return {
        ...discountDetails,
        couponId: coupon.id,
        couponName: coupon.name || undefined,
        percentOff: coupon.percent_off || undefined,
        amountOff: coupon.amount_off ? coupon.amount_off / 100 : undefined
      };
    }

    // Handle automatic discounts
    if (session.discount?.coupon) {
      const coupon = session.discount.coupon;
      return {
        ...discountDetails,
        couponId: coupon.id,
        couponName: coupon.name,
        percentOff: coupon.percent_off,
        amountOff: coupon.amount_off ? coupon.amount_off / 100 : undefined
      };
    }

    return discountDetails;
  } catch (error) {
    console.error('Error getting discount details:', error);
    return null;
  }
};

export const webhookController = {
  handleWebhook: async (req: StripeRequest, res: Response): Promise<void> => {
    try {
      console.log('Webhook received:', {
        type: (req.body as any)?.type,
        id: (req.body as any)?.data?.object?.id
      });
      
      const sig = req.headers['stripe-signature'];
      const webhookSecret = config.stripe.webhookSecret;

      if (!sig || !webhookSecret) {
        console.error('Missing stripe signature or webhook secret');
        res.status(400).send('Webhook Error: Missing stripe signature or webhook secret');
        return;
      }

      if (!req.rawBody) {
        console.error("No raw body available");
        res.status(400).send("Webhook Error: Invalid raw body");
        return;
      }

      let event: StripeEvent;
      try {
        event = stripe.webhooks.constructEvent(
          req.rawBody,
          sig as string,
          webhookSecret
        );
        console.log('Successfully verified webhook signature for event:', event.type);
      } catch (err) {
        const error = err as Error;
        console.error('Webhook signature verification failed:', {
          error: error.message,
          stack: error.stack
        });
        res.status(400).send(`Webhook signature verification failed: ${error.message}`);
        return;
      }

      console.log('Processing webhook event:', {
        type: event.type,
        id: event.id,
        objectId: (event.data.object as any).id
      });

      // Handle the event
      switch (event.type) {
        case 'payment_intent.requires_action': {
          const paymentIntent = event.data.object as StripePaymentIntent;
          console.log('Payment requires action - Full payment intent:', JSON.stringify(paymentIntent, null, 2));
          console.log('Payment requires action - Raw metadata:', JSON.stringify(paymentIntent.metadata, null, 2));
          
          try {
            // Clean metadata to prevent undefined values
            const cleanMetadata = paymentIntent.metadata ? Object.entries(paymentIntent.metadata).reduce((acc, [key, value]) => {
              console.log(`Cleaning metadata key: ${key}, value:`, value);
              return {
                ...acc,
                [key]: value === undefined ? null : value
              };
            }, {}) : {};
            
            console.log('Cleaned metadata:', JSON.stringify(cleanMetadata, null, 2));

            // Store initial payment record with requires_action status
            const paymentData = {
              paymentIntentId: paymentIntent.id,
              customerId: paymentIntent.customer || null,
              amount: paymentIntent.amount ? paymentIntent.amount / 100 : 0,
              currency: paymentIntent.currency || 'eur',
              paymentStatus: 'requires_action',
              metadata: cleanMetadata,
              nextAction: paymentIntent.next_action || null,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            console.log('Payment data to store:', JSON.stringify(paymentData, (key, value) => 
              value && value.constructor.name === 'FieldValue' ? '[ServerTimestamp]' : value, 2));

            await admin.firestore()
              .collection('payments')
              .doc(paymentIntent.id)
              .set(paymentData);
            
            console.log('Successfully stored payment record with requires_action status');
          } catch (error) {
            console.error('Error handling requires_action:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : '');
          }
          break;
        }

        case 'payment_intent.created': {
          const paymentIntent = event.data.object as StripePaymentIntent;
          console.log('Payment intent created - Full payment intent:', JSON.stringify(paymentIntent, null, 2));
          console.log('Payment intent created - Raw metadata:', JSON.stringify(paymentIntent.metadata, null, 2));
          
          try {
            // Clean metadata to prevent undefined values
            const cleanMetadata = paymentIntent.metadata ? Object.entries(paymentIntent.metadata).reduce((acc, [key, value]) => {
              console.log(`Cleaning metadata key: ${key}, value:`, value);
              return {
                ...acc,
                [key]: value === undefined ? null : value
              };
            }, {}) : {};
            
            console.log('Cleaned metadata:', JSON.stringify(cleanMetadata, null, 2));

            // Store initial payment record
            const paymentData = {
              paymentIntentId: paymentIntent.id,
              customerId: paymentIntent.customer || null,
              amount: paymentIntent.amount ? paymentIntent.amount / 100 : 0,
              currency: paymentIntent.currency || 'eur',
              paymentStatus: paymentIntent.status || 'unknown',
              metadata: cleanMetadata,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            console.log('Payment data to store:', JSON.stringify(paymentData, (key, value) => 
              value && value.constructor.name === 'FieldValue' ? '[ServerTimestamp]' : value, 2));

            await admin.firestore()
              .collection('payments')
              .doc(paymentIntent.id)
              .set(paymentData);
            
            console.log('Successfully stored initial payment record');
          } catch (error) {
            console.error('Error handling payment_intent.created:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : '');
          }
          break;
        }

        case 'checkout.session.completed': {
          const session = event.data.object as StripeCheckoutSession;
          console.log('Checkout session completed. Session ID:', session.id);
          console.log('Session mode:', session.mode);
          console.log('Session payment status:', session.payment_status);
          console.log('Session metadata:', session.metadata);
          console.log('Session payment intent:', session.payment_intent);
          
          let customer;
          let products = [];
          let discountDetails = null;
          let taxDetails = null;
          let emailSent = false;
          let paymentIntent = null;
          let subscription = null;

          try {
            // Get payment intent or subscription based on mode
            if (session.mode === 'subscription' && session.subscription) {
              subscription = await stripe.subscriptions.retrieve(session.subscription as string);
              console.log('Retrieved subscription:', JSON.stringify(subscription, null, 2));
            } else if (session.payment_intent) {
              paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
              console.log('Retrieved payment intent:', JSON.stringify(paymentIntent, null, 2));
            }

            // Get customer details
            customer = await stripe.customers.retrieve(session.customer as string);
            console.log('Retrieved customer data:', JSON.stringify(customer, null, 2));
            
            if (!customer || customer.deleted) {
              throw new Error('Customer not found');
            }

            // Get line items from the session
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
              expand: ['data.price.product']
            });
            console.log('Retrieved line items:', JSON.stringify(lineItems, null, 2));
            
            // Get the product details
            for (const item of lineItems.data) {
              if (item.price?.product) {
                const product = typeof item.price.product === 'string' 
                  ? await stripe.products.retrieve(item.price.product)
                  : item.price.product as Stripe.Product;
                console.log('Retrieved product:', JSON.stringify(product, null, 2));
                if (!product.deleted) {
                  products.push({
                    id: product.id,
                    name: product.name,
                    courseIds: product.metadata?.courseIds ? product.metadata.courseIds.split(',') : []
                  });
                }
              }
            }
            console.log('Processed products:', JSON.stringify(products, null, 2));

            // Get discount details if any
            discountDetails = await getDiscountDetails(session);
            console.log('Discount details:', JSON.stringify(discountDetails, null, 2));

            // Get tax details
            taxDetails = session.total_details?.amount_tax ? {
              amount: session.total_details.amount_tax / 100,
              rate: session.total_details.amount_tax / (session.amount_subtotal || 1) * 100,
              country: customer.address?.country || null,
              tax_behavior: 'exclusive',
              tax_type: 'vat',
              tax_code: 'txcd_10201000'
            } : null;
            console.log('Tax details:', JSON.stringify(taxDetails, null, 2));

            // Try to store payment details
            try {
              console.log('Storing payment details...');
              
              // Get payment plan from various sources based on payment type
              const paymentPlan = session.mode === 'subscription'
                ? (subscription?.metadata?.paymentPlan || customer.metadata?.paymentPlan || '0')
                : (paymentIntent?.metadata?.paymentPlan || session.metadata?.paymentPlan || customer.metadata?.paymentPlan || '0');
              console.log('Payment plan:', paymentPlan);

              // Ensure clean billing address
              const billingAddress = customer.address ? {
                line1: customer.address.line1 || null,
                city: customer.address.city || null,
                postal_code: customer.address.postal_code || null,
                country: customer.address.country || null
              } : null;

              // Clean metadata
              const cleanMetadata = {
                products: products.map(p => ({
                  id: p.id || null,
                  name: p.name || null,
                  courseIds: Array.isArray(p.courseIds) ? p.courseIds.filter(Boolean) : []
                })).filter(p => p.id && p.name),
                customerName: `${customer.metadata?.firstName || ''} ${customer.metadata?.lastName || ''}`.trim() || 'Unknown',
                paymentPlan: paymentPlan || '0',
                paymentMode: session.mode || 'payment',
                originalAmount: session.amount_subtotal ? session.amount_subtotal / 100 : 0,
                totalAmount: session.amount_total ? session.amount_total / 100 : 0,
                billingAddress: billingAddress || null,
                customerMetadata: customer.metadata ? JSON.parse(JSON.stringify(customer.metadata)) : {},
                subscriptionId: subscription?.id || null,
                invoiceNumber: subscription?.latest_invoice 
                  ? typeof subscription.latest_invoice === 'string' 
                    ? subscription.latest_invoice 
                    : subscription.latest_invoice.number
                  : (paymentIntent?.metadata?.invoice_id || null)
              };

              // Clean payment details
              const paymentDetails = {
                sessionId: session.id,
                customerId: session.customer as string,
                customerEmail: customer.email || '',
                amountPaid: session.amount_total ? session.amount_total / 100 : 0,
                paymentStatus: session.payment_status || 'unknown',
                paymentType: session.mode === 'subscription' ? 'subscription' as const : 'one_time' as const,
                metadata: cleanMetadata,
                discountDetails: discountDetails ? JSON.parse(JSON.stringify(discountDetails)) : null,
                taxDetails: taxDetails ? JSON.parse(JSON.stringify(taxDetails)) : null,
                paymentIntentId: session.payment_intent ? String(session.payment_intent) : null
              };

              console.log('Payment details to store:', JSON.stringify(paymentDetails, null, 2));
              await storePaymentDetails(paymentDetails);
              console.log('Payment details stored successfully');
            } catch (storeError) {
              console.error('Error storing payment details:', storeError);
              if (storeError instanceof Error) {
                console.error('Store error stack:', storeError.stack);
                await admin.firestore()
                  .collection('errors')
                  .add({
                    type: 'payment_storage_error',
                    sessionId: session.id,
                    customerId: session.customer,
                    error: storeError.message,
                    stack: storeError.stack,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                  });
              }
            }

            // Always try to send the email, even if payment storage failed
            const confirmationData = {
              email: customer.email || '',
              firstName: customer.metadata?.firstName || '',
              lastName: customer.metadata?.lastName || '',
              orderId: session.mode === 'subscription' ? session.subscription as string : session.payment_intent as string,
              amount: session.amount_total ? session.amount_total / 100 : 0,
              originalAmount: session.amount_subtotal ? session.amount_subtotal / 100 : 0,
              discount: discountDetails,
              paymentPlan: parseInt(session.metadata?.paymentPlan || customer.metadata?.paymentPlan || '0'),
              billingDetails: {
                street: customer.address?.line1?.split(' ')[0] || '',
                streetNumber: customer.address?.line1?.split(' ')[1] || '',
                zipCode: customer.address?.postal_code || '',
                city: customer.address?.city || '',
                country: customer.address?.country || ''
              },
              purchasedCourseIds: products.flatMap(p => p.courseIds),
              purchasedProducts: products,
              isSalesPartner: customer.metadata?.becomePartner === 'yes',
              isSubscription: session.mode === 'subscription'
            };

            console.log('Sending purchase confirmation email with data:', JSON.stringify(confirmationData, null, 2));
            const emailResult = await sendPurchaseConfirmationEmail(confirmationData);
            console.log('Email sent successfully:', JSON.stringify(emailResult, null, 2));
            emailSent = true;

          } catch (error) {
            console.error('Error processing checkout session:', error);
            if (error instanceof Error) {
              console.error('Error stack:', error.stack);
              try {
                await admin.firestore()
                  .collection('errors')
                  .add({
                    type: 'checkout_session_error',
                    sessionId: session.id,
                    customerId: session.customer,
                    emailSent,
                    error: error.message,
                    stack: error.stack,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                  });
              } catch (logError) {
                console.error('Error logging to Firestore:', logError);
              }
            }
          }
          break;
        }

        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as StripePaymentIntent;
          console.log('Payment succeeded:', {
            id: paymentIntent.id,
            amount: paymentIntent.amount,
            status: paymentIntent.status,
            customerId: paymentIntent.customer,
            metadata: paymentIntent.metadata
          });
          
          let emailSent = false;
          
          try {
            // Get customer details
            const customer = await stripe.customers.retrieve(paymentIntent.customer as string);
            console.log('Retrieved customer data:', JSON.stringify(customer, null, 2));
            
            if (!customer || customer.deleted) {
              throw new Error('Customer not found');
            }

            // Get the session ID from metadata if available
            const sessionId = paymentIntent.metadata?.session_id;
            let products = [];

            // If we have a session ID, get the products from the session
            if (sessionId) {
              console.log('Retrieving session data for ID:', sessionId);
              const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
                expand: ['data.price.product']
              });
              
              for (const item of lineItems.data) {
                if (item.price?.product) {
                  const product = typeof item.price.product === 'string' 
                    ? await stripe.products.retrieve(item.price.product)
                    : item.price.product as Stripe.Product;
                  if (!product.deleted) {
                    products.push({
                      id: product.id,
                      name: product.name,
                      courseIds: product.metadata?.courseIds ? product.metadata.courseIds.split(',') : []
                    });
                  }
                }
              }
              console.log('Retrieved products:', JSON.stringify(products, null, 2));
            }

            // Try to store payment record, but continue even if it fails
            try {
              // Update payment status in database
              const querySnapshot = await admin.firestore()
                .collection('payments')
                .where('paymentIntentId', '==', paymentIntent.id)
                .get();

              console.log('Found matching payments:', querySnapshot.size);
              
              if (querySnapshot.empty) {
                console.log('No payment record found for payment intent:', paymentIntent.id);
                // Store a temporary payment record with clean metadata
                const cleanMetadata = {
                  ...JSON.parse(JSON.stringify(paymentIntent.metadata || {})),
                  paymentPlan: (paymentIntent.metadata?.paymentPlan || customer.metadata?.paymentPlan || '0').toString(),
                  customerName: `${customer.metadata?.firstName || ''} ${customer.metadata?.lastName || ''}`.trim() || 'Unknown',
                  products: products.map(p => ({ 
                    id: p.id || '', 
                    name: p.name || '' 
                  })).filter((p: any) => p.id && p.name)
                };

                await admin.firestore()
                  .collection('payments')
                  .doc(paymentIntent.id)
                  .set({
                    paymentIntentId: paymentIntent.id,
                    paymentStatus: 'succeeded',
                    amountPaid: paymentIntent.amount / 100,
                    customerId: paymentIntent.customer,
                    metadata: cleanMetadata,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                  });
                console.log('Created temporary payment record for:', paymentIntent.id);
              } else {
                const batch = admin.firestore().batch();
                querySnapshot.forEach((doc) => {
                  console.log('Updating payment record:', doc.id);
                  batch.update(doc.ref, {
                    paymentStatus: 'succeeded',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                  });
                });
                await batch.commit();
                console.log('Updated existing payment records');
              }
            } catch (storageError) {
              console.error('Error storing payment record:', storageError);
              // Continue with email sending even if storage fails
            }

            // Send confirmation email
            console.log('Preparing confirmation data for email...');
            const confirmationData = {
              email: customer.email || '',
              firstName: customer.metadata?.firstName || '',
              lastName: customer.metadata?.lastName || '',
              orderId: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              originalAmount: paymentIntent.amount / 100,
              paymentPlan: parseInt(paymentIntent.metadata?.paymentPlan || customer.metadata?.paymentPlan || '0'),
              billingDetails: {
                street: customer.address?.line1?.split(' ')[0] || '',
                streetNumber: customer.address?.line1?.split(' ')[1] || '',
                zipCode: customer.address?.postal_code || '',
                city: customer.address?.city || '',
                country: customer.address?.country || ''
              },
              purchasedCourseIds: products.flatMap(p => p.courseIds),
              purchasedProducts: products,
              isSalesPartner: customer.metadata?.becomePartner === 'yes',
              isSubscription: false
            };

            console.log('Sending purchase confirmation email with data:', JSON.stringify(confirmationData, null, 2));
            const emailResult = await sendPurchaseConfirmationEmail(confirmationData);
            console.log('Email sent successfully:', JSON.stringify(emailResult, null, 2));
            emailSent = true;

          } catch (error) {
            console.error('Error processing payment success:', error);
            if (error instanceof Error) {
              console.error('Error stack:', error.stack);
              try {
                await admin.firestore()
                  .collection('errors')
                  .add({
                    type: 'payment_success_error',
                    paymentIntentId: paymentIntent.id,
                    customerId: paymentIntent.customer,
                    emailSent,
                    error: error.message,
                    stack: error.stack,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                  });
              } catch (logError) {
                console.error('Error logging to Firestore:', logError);
              }
            }
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          const failedPayment = event.data.object as StripePaymentIntent;
          console.log('Payment failed:', failedPayment.id);
          
          try {
            // Update payment status in database
            await admin.firestore()
              .collection('payments')
              .where('paymentIntentId', '==', failedPayment.id)
              .get()
              .then(async (querySnapshot) => {
                const batch = admin.firestore().batch();
                querySnapshot.forEach((doc) => {
                  batch.update(doc.ref, {
                    paymentStatus: 'failed',
                    failureReason: failedPayment.last_payment_error?.message,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                  });
                });
                await batch.commit();
              });

            // If customer exists, send payment failed email
            if (failedPayment.customer) {
              const customer = await stripe.customers.retrieve(failedPayment.customer as string);
              if (customer && !customer.deleted && customer.email) {
                // TODO: Implement payment failed email notification
                console.log('Should send payment failed email to:', customer.email);
              }
            }
          } catch (error) {
            console.error('Error handling failed payment:', error);
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as StripeInvoice;
          console.log('Invoice payment succeeded. Invoice ID:', invoice.id);
          console.log('Subscription ID:', invoice.subscription);
          console.log('Customer ID:', invoice.customer);
          
          try {
            if (invoice.subscription) {
              console.log('Processing subscription invoice');
              const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
              console.log('Retrieved subscription data:', JSON.stringify(subscription, null, 2));
              const customer = await stripe.customers.retrieve(subscription.customer as string);
              
              if (!customer || customer.deleted) {
                throw new Error('Customer not found');
              }

              // Get the product details from the subscription
              const products = [];
              for (const item of subscription.items.data) {
                if (item.price?.product) {
                  const product = await stripe.products.retrieve(item.price.product as string);
                  products.push({
                    id: product.id,
                    name: product.name,
                    courseIds: product.metadata.courseIds ? product.metadata.courseIds.split(',') : []
                  });
                }
              }

              // Store payment details for subscription payment
              await storePaymentDetails({
                sessionId: invoice.id,
                customerId: customer.id,
                customerEmail: customer.email || '',
                amountPaid: invoice.amount_paid ? invoice.amount_paid / 100 : 0,
                paymentStatus: 'succeeded',
                paymentType: 'subscription',
                metadata: {
                  subscriptionId: subscription.id,
                  products: products.map(p => ({ id: p.id, name: p.name })),
                  customerName: `${customer.metadata?.firstName || ''} ${customer.metadata?.lastName || ''}`.trim(),
                  invoiceNumber: invoice.number
                }
              });

              // Send confirmation for recurring payments
              if (!invoice.billing_reason?.includes('subscription_create')) {
                const confirmationData = {
                  email: customer.email || '',
                  firstName: customer.metadata?.firstName || '',
                  lastName: customer.metadata?.lastName || '',
                  orderId: subscription.id,
                  amount: invoice.amount_paid ? invoice.amount_paid / 100 : 0,
                  paymentPlan: customer.metadata?.paymentPlan ? parseInt(customer.metadata.paymentPlan) : 0,
                  billingDetails: {
                    street: customer.address?.line1?.split(' ')[0] || '',
                    streetNumber: customer.address?.line1?.split(' ')[1] || '',
                    zipCode: customer.address?.postal_code || '',
                    city: customer.address?.city || '',
                    country: customer.address?.country || ''
                  },
                  purchasedCourseIds: products.flatMap(p => p.courseIds),
                  purchasedProducts: products,
                  isSalesPartner: customer.metadata?.becomePartner === 'yes',
                  isSubscription: true
                };

                await sendPurchaseConfirmationEmail(confirmationData);
              }
            }
          } catch (error) {
            console.error('Error processing invoice payment:', error);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const failedInvoice = event.data.object as StripeInvoice;
          console.log('Invoice payment failed:', failedInvoice.id);
          
          if (failedInvoice.subscription) {
            try {
              const subscription = await stripe.subscriptions.retrieve(failedInvoice.subscription as string);
              const customer = await stripe.customers.retrieve(subscription.customer as string);
              
              if (!customer || customer.deleted) {
                throw new Error('Customer not found');
              }

              // Update subscription status in database
              await admin.firestore()
                .collection('subscriptions')
                .doc(subscription.id)
                .set({
                  status: 'past_due',
                  lastFailedPayment: admin.firestore.FieldValue.serverTimestamp(),
                  customerId: customer.id,
                  customerEmail: customer.email
                }, { merge: true });

              // Handle failed payment with retry logic
              await subscriptionController.handleFailedPayment({
                params: { subscriptionId: subscription.id },
                body: { gracePeriodDays: 7 }
              } as any, res);
            } catch (error) {
              console.error('Error handling failed payment:', error);
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const deletedSubscription = event.data.object as StripeSubscription;
          console.log('Subscription cancelled:', deletedSubscription.id);
          
          try {
            // Update subscription status in database
            await admin.firestore()
              .collection('subscriptions')
              .doc(deletedSubscription.id)
              .set({
                status: 'cancelled',
                cancelledAt: admin.firestore.FieldValue.serverTimestamp()
              }, { merge: true });
          } catch (error) {
            console.error('Error handling subscription cancellation:', error);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as StripeSubscription;
          console.log('Subscription updated:', subscription.id);
          
          try {
            // Check for past due status
            if (subscription.status === 'past_due') {
              const customer = await stripe.customers.retrieve(subscription.customer as string);
              if (!customer || customer.deleted) {
                throw new Error('Customer not found');
              }

              // Send reminder email
              // TODO: Implement reminder email sending
            }

            // Update subscription status in database
            await admin.firestore()
              .collection('subscriptions')
              .doc(subscription.id)
              .set({
                status: subscription.status,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              }, { merge: true });

            await handleSubscriptionWebhook(event);
          } catch (error) {
            console.error('Error handling subscription update:', error);
          }
          break;
        }

        case 'customer.subscription.created':
          const newSubscription = event.data.object as StripeSubscription;
          console.log('New subscription created. Subscription ID:', newSubscription.id);
          console.log('Subscription status:', newSubscription.status);
          console.log('Customer ID:', newSubscription.customer);
          
          try {
            // Get customer details
            const customer = await stripe.customers.retrieve(newSubscription.customer as string);
            console.log('Retrieved customer data for subscription:', JSON.stringify(customer, null, 2));
            if (!customer || customer.deleted) {
              throw new Error('Customer not found');
            }

            // Get the product details from the subscription
            const products = [];
            for (const item of newSubscription.items.data) {
              if (item.price?.product) {
                const product = await stripe.products.retrieve(item.price.product as string);
                products.push({
                  id: product.id,
                  name: product.name,
                  courseIds: product.metadata.courseIds ? product.metadata.courseIds.split(',') : []
                });
              }
            }

            // Get the latest invoice
            const latestInvoice = await stripe.invoices.retrieve(newSubscription.latest_invoice as string);

            // Store payment details
            await storePaymentDetails({
              sessionId: newSubscription.id,
              customerId: customer.id,
              customerEmail: customer.email || '',
              amountPaid: latestInvoice.amount_paid ? latestInvoice.amount_paid / 100 : 0,
              paymentStatus: 'succeeded',
              paymentType: 'subscription',
              metadata: {
                subscriptionId: newSubscription.id,
                products: products.map(p => ({ id: p.id, name: p.name })),
                customerName: `${customer.metadata?.firstName || ''} ${customer.metadata?.lastName || ''}`.trim(),
                invoiceNumber: latestInvoice.number
              }
            });

            // Send confirmation email
            const confirmationData = {
              email: customer.email || '',
              firstName: customer.metadata?.firstName || '',
              lastName: customer.metadata?.lastName || '',
              orderId: newSubscription.id,
              amount: latestInvoice.amount_paid ? latestInvoice.amount_paid / 100 : 0,
              paymentPlan: customer.metadata?.paymentPlan ? parseInt(customer.metadata.paymentPlan) : 0,
              billingDetails: {
                street: customer.address?.line1?.split(' ')[0] || '',
                streetNumber: customer.address?.line1?.split(' ')[1] || '',
                zipCode: customer.address?.postal_code || '',
                city: customer.address?.city || '',
                country: customer.address?.country || ''
              },
              purchasedCourseIds: products.flatMap(p => p.courseIds),
              purchasedProducts: products,
              isSalesPartner: customer.metadata?.becomePartner === 'yes',
              isSubscription: true
            };

            await sendPurchaseConfirmationEmail(confirmationData);
          } catch (error) {
            console.error('Error processing new subscription:', error);
          }
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Return a 200 response to acknowledge receipt of the event
      res.json({ received: true });
    } catch (err) {
      console.error('Webhook Error:', err);
      res.status(400).send(
        `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }
};

const handleSubscriptionWebhook = async (event: StripeEvent) => {
  try {
    switch (event.type) {   
      case 'invoice.payment_failed': {
        const invoiceObject = event.data.object as StripeInvoice;
        if (invoiceObject.subscription) {
          const subscription = await stripeService.subscriptions.retrieve(invoiceObject.subscription as string);
          await subscriptionController.handleFailedPayment({
            params: { subscriptionId: subscription.id },
            body: { gracePeriodDays: 7 }
          } as any, {} as Response);
        }
        break;
      }
    
      case 'customer.subscription.updated': {
        const updatedSubscription = event.data.object as StripeSubscription;
        // Check if subscription is about to renew
        const daysUntilRenewal = Math.ceil((updatedSubscription.current_period_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
        if ([7, 3, 1].includes(daysUntilRenewal)) {
          await subscriptionController.sendRenewalReminder({
            params: { subscriptionId: updatedSubscription.id }
          } as any, {} as Response);
        }
        break;
      }
    }
  } catch (error) {
    console.error("Error handling subscription webhook:", error);
  }
}; 