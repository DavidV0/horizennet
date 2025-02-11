import { Response } from 'express';
import { StripeRequest, StripeEvent, StripePaymentIntent, StripeInvoice, StripeSubscription } from '../types/stripe.types';
import { stripe, stripeService } from '../services/stripe.service';
import { config } from '../config';
import { subscriptionController } from './subscription.controller';

export const webhookController = {
  handleWebhook: async (req: StripeRequest, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = config.stripe.webhookSecret;

    if (!sig || !webhookSecret) {
      console.error('Missing stripe signature or webhook secret');
      res.status(400).send('Webhook Error: Missing stripe signature or webhook secret');
      return;
    }

    let event: StripeEvent;

    try {
      // Get raw body from the request
    

      console.log('Webhook Secret:', webhookSecret);
      console.log('Stripe Signature:', sig);
      
      // Verify the signature
      const rawBody = req.rawBody;

      if (!rawBody || !(rawBody instanceof Buffer)) {
        console.error("No raw body available or incorrect type");
        res.status(400).send("Webhook Error: Invalid raw body");
        return;
      }
      
      event = stripe.webhooks.constructEvent(
        rawBody, // Pass it directly as Buffer
        sig as string,
        webhookSecret
      );

      console.log('Successfully verified webhook signature');
      console.log('Event type:', event.type);

      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as StripePaymentIntent;
          console.log('Payment succeeded:', paymentIntent.id);
          break;

        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object as StripePaymentIntent;
          console.log('Payment failed:', failedPayment.id);
          break;

        case 'invoice.payment_succeeded':
          const invoice = event.data.object as StripeInvoice;
          console.log('Invoice paid:', invoice.id);
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object as StripeInvoice;
          console.log('Invoice payment failed:', failedInvoice.id);
          if (failedInvoice.subscription) {
            await subscriptionController.handleFailedPayment({
              params: { subscriptionId: failedInvoice.subscription as string },
              body: { gracePeriodDays: 7 }
            } as any, res);
          }
          break;

        case 'customer.subscription.updated':
          const subscription = event.data.object as StripeSubscription;
          console.log('Subscription updated:', subscription.id);
          await handleSubscriptionWebhook(event);
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as StripeSubscription;
          console.log('Subscription cancelled:', deletedSubscription.id);
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