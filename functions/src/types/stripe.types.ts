import Stripe from 'stripe';
import { Request } from 'express';

// Re-export Stripe types needed by controllers
export type StripeEvent = Stripe.Event;
export type StripePaymentIntent = Stripe.PaymentIntent;
export type StripeInvoice = Stripe.Invoice;
export type StripeSubscription = Stripe.Subscription;
export type StripeCustomer = Stripe.Customer;
export type StripeProduct = Stripe.Product;
export type StripePrice = Stripe.Price;
export type StripePaymentMethod = Stripe.PaymentMethod;
export type StripeSetupIntent = Stripe.SetupIntent;
export type StripeWebhookEndpoint = Stripe.WebhookEndpoint;
export type StripeCheckoutSession = Stripe.Checkout.Session & {
  promotion_code?: string;
  discount?: {
    coupon: {
      id: string;
      name?: string;
      percent_off?: number;
      amount_off?: number;
    };
  };
  total_details?: {
    amount_discount?: number;
    amount_shipping?: number;
    amount_tax?: number;
  };
};

// Custom request type for Stripe webhooks
export interface StripeRequest extends Request {
  rawBody?: Buffer; // Make it optional to prevent TypeScript errors
  body: Buffer | string | Record<string, unknown>; // Avoid `any`
  headers: {
    'stripe-signature'?: string;
    [key: string]: string | string[] | undefined;
  };
}
