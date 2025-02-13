import { Request } from 'express';

export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  privacyPolicy: boolean;
  timestamp: Date;
}

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface ExtendedRequest extends Request {
  params: {
    subscriptionId: string;
  };
  body: {
    gracePeriodDays?: number;
    paymentMethodId?: string;
  };
}

export interface StripeRequest extends Request {
  rawBody?: Buffer;
}

export interface PurchaseConfirmationData {
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
  productType?: 'academy' | 'crypto';
}

export interface ActivationConfirmationData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  userId: string;
  productType: string;
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer;
  path?: string;
}

export interface ConsentData {
  acceptTerms: boolean;
  consent1: boolean;
  consent2: boolean;
  timestamp: string;
}

export interface ProductData {
  name: string;
  courseIds: string[];
  activated: boolean;
  activatedAt: Date | null;
} 