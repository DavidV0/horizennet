import Stripe from 'stripe';
import { config } from '../config';

// Initialize Stripe with the latest API version
export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2024-12-18.acacia'
});

// Log the key being used (masked)
const stripeKey = config.stripe.secretKey;
console.log('Using Stripe key:', stripeKey ? stripeKey.substring(0, 8) + '...' : 'No key found');

export const stripeService = {
  customers: {
    create: async (data: Stripe.CustomerCreateParams) => {
      return await stripe.customers.create(data);
    },
    retrieve: async (customerId: string) => {
      return await stripe.customers.retrieve(customerId);
    },
    update: async (customerId: string, data: Stripe.CustomerUpdateParams) => {
      return await stripe.customers.update(customerId, data);
    }
  },
  
  paymentIntents: {
    create: async (data: Stripe.PaymentIntentCreateParams) => {
      return await stripe.paymentIntents.create(data);
    },
    retrieve: async (paymentIntentId: string) => {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    },
    update: async (paymentIntentId: string, data: Stripe.PaymentIntentUpdateParams) => {
      return await stripe.paymentIntents.update(paymentIntentId, data);
    },
    confirm: async (paymentIntentId: string) => {
      return await stripe.paymentIntents.confirm(paymentIntentId);
    },
    capture: async (paymentIntentId: string, data?: Stripe.PaymentIntentCaptureParams) => {
      return await stripe.paymentIntents.capture(paymentIntentId, data);
    }
  },

  subscriptions: {
    create: async (data: Stripe.SubscriptionCreateParams) => {
      return await stripe.subscriptions.create(data);
    },
    retrieve: async (subscriptionId: string) => {
      return await stripe.subscriptions.retrieve(subscriptionId);
    },
    update: async (subscriptionId: string, data: Stripe.SubscriptionUpdateParams) => {
      return await stripe.subscriptions.update(subscriptionId, data);
    },
    cancel: async (subscriptionId: string) => {
      return await stripe.subscriptions.cancel(subscriptionId);
    }
  },

  prices: {
    create: async (data: Stripe.PriceCreateParams) => {
      return await stripe.prices.create(data);
    },
    retrieve: async (priceId: string) => {
      return await stripe.prices.retrieve(priceId);
    },
    update: async (priceId: string, data: Stripe.PriceUpdateParams) => {
      return await stripe.prices.update(priceId, data);
    },
    list: async (params?: Stripe.PriceListParams) => {
      return await stripe.prices.list(params);
    }
  },

  products: {
    retrieve: async (productId: string) => {
      return await stripe.products.retrieve(productId);
    },
    update: async (productId: string, data: Stripe.ProductUpdateParams) => {
      return await stripe.products.update(productId, data);
    }
  },

  setupIntents: {
    create: async (data: Stripe.SetupIntentCreateParams) => {
      return await stripe.setupIntents.create(data);
    }
  },

  paymentMethods: {
    attach: async (paymentMethodId: string, data: Stripe.PaymentMethodAttachParams) => {
      return await stripe.paymentMethods.attach(paymentMethodId, data);
    }
  },

  invoices: {
    create: async (data: Stripe.InvoiceCreateParams) => {
      return await stripe.invoices.create(data);
    },
    retrieve: async (invoiceId: string) => {
      return await stripe.invoices.retrieve(invoiceId);
    },
    pay: async (invoiceId: string, params?: Stripe.InvoicePayParams) => {
      return await stripe.invoices.pay(invoiceId, params);
    },
    finalizeInvoice: async (invoiceId: string) => {
      return await stripe.invoices.finalizeInvoice(invoiceId);
    }
  },

  invoiceItems: {
    create: async (data: Stripe.InvoiceItemCreateParams) => {
      return await stripe.invoiceItems.create(data);
    }
  },

  webhooks: {
    constructEvent: (payload: string | Buffer, header: string, secret: string) => {
      return stripe.webhooks.constructEvent(payload, header, secret);
    }
  },

  checkout: {
    sessions: {
      create: async (data: Stripe.Checkout.SessionCreateParams) => {
        return await stripe.checkout.sessions.create(data);
      },
      retrieve: async (sessionId: string) => {
        return await stripe.checkout.sessions.retrieve(sessionId);
      }
    }
  }
}; 