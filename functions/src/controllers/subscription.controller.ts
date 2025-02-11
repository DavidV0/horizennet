import { Request, Response } from 'express';
import { StripeInvoice, StripePaymentIntent,StripeCustomer } from '../types/stripe.types';
import { ExtendedRequest } from '../types';
import { stripeService } from '../services/stripe.service';
import { sendEmail } from '../services/email.service';

export const subscriptionController = {
  createSubscription: async (req: Request, res: Response) => {
    try {
      const { priceId, customerId, paymentMethodId } = req.body;

      // First attach the payment method to the customer
      await stripeService.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set it as the default payment method
      await stripeService.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create the subscription
      const subscription = await stripeService.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: "allow_incomplete",
        collection_method: "charge_automatically",
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: "on_subscription"
        },
        expand: ['latest_invoice.payment_intent']
      });

      const latestInvoice = subscription.latest_invoice as StripeInvoice;
      const paymentIntent = latestInvoice?.payment_intent as StripePaymentIntent;
        
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
  },

  getSubscriptionStatus: async (req: Request, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      const subscription = await stripeService.subscriptions.retrieve(subscriptionId);

      res.json({
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Error fetching subscription" });
    }
  },

  cancelSubscription: async (req: Request, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      const subscription = await stripeService.subscriptions.cancel(subscriptionId);

      res.json({
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: "Error canceling subscription" });
    }
  },

  handleFailedPayment: async (req: ExtendedRequest, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      const { gracePeriodDays = 7 } = req.body;
      
      const subscription = await stripeService.subscriptions.retrieve(subscriptionId);
      const customerResponse = await stripeService.customers.retrieve(subscription.customer as string);
      
      // Check if customer is deleted
      if ('deleted' in customerResponse) {
        throw new Error('Customer not found or deleted');
      }
      
      const customer = customerResponse as StripeCustomer;
      
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
      await stripeService.subscriptions.update(subscriptionId, {
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
  },

  sendRenewalReminder: async (req: ExtendedRequest, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      
      const subscription = await stripeService.subscriptions.retrieve(subscriptionId);
      const customerResponse = await stripeService.customers.retrieve(subscription.customer as string);
      
      // Check if customer is deleted
      if ('deleted' in customerResponse) {
        throw new Error('Customer not found or deleted');
      }
      
      const customer = customerResponse as StripeCustomer;
      
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
      await stripeService.subscriptions.update(subscriptionId, {
        metadata: {
          lastNotificationSent: new Date().toISOString()
        }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error sending renewal reminder:', error);
      res.status(500).json({ error: error.message });
    }
  },

  updatePaymentMethod: async (req: ExtendedRequest, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      const { paymentMethodId } = req.body;
      
      if (!paymentMethodId) {
        throw new Error('Payment method ID is required');
      }
      
      const subscription = await stripeService.subscriptions.retrieve(subscriptionId);

      // Attach new payment method to customer
      await stripeService.paymentMethods.attach(paymentMethodId, {
        customer: subscription.customer as string,
      });

      // Update subscription's default payment method
      await stripeService.subscriptions.update(subscriptionId, {
        default_payment_method: paymentMethodId
      });

      // If subscription is past_due, try to pay the latest invoice
      if (subscription.status === 'past_due') {
        const latestInvoice = await stripeService.invoices.retrieve(subscription.latest_invoice as string);
        if (latestInvoice.status === 'open') {
          await stripeService.invoices.pay(latestInvoice.id, {
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
  }
}; 