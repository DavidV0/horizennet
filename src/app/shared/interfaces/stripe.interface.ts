export interface StripeCustomer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: {
    line1: string;
    postal_code: string;
    city: string;
    country: string;
  };
  metadata?: {
    firstName: string;
    lastName: string;
    language: string;
    newsletter: string;
    becomePartner: string;
  };
}

export interface StripePaymentIntent {
  id: string;
  clientSecret: string;
  status: 'succeeded' | 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled';
  invoice_id?: string;
}

export interface StripeSubscription {
  id: string;
  status: string;
  currentPeriodEnd: number;
  gracePeriodEnd?: number;
  clientSecret?: string;
}

export interface StripeSetupIntent {
  id: string;
  client_secret: string;
  status: string;
}

export interface StripePriceResponse {
  productId: string;
  priceIds: {
    fullPayment: string;
    sixMonths: string;
    twelveMonths: string;
    eighteenMonths: string;
    thirtyMonths: string;
  };
  priceDetails: {
    [key: string]: {
      nickname: string;
      metadata: any;
      lookup_key: string;
    };
  };
} 