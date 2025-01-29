import { Progress } from './progress.model';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  street: string;
  streetNumber: string;
  zipCode: string;
  city: string;
  country: string;
  mobile: string;
  photoURL?: string;
  paymentPlan: number;
  purchaseDate: Date;
  productKey: string;
  status: string;
  keyActivated: boolean;
  accountActivated: boolean;
  activatedAt?: Date;
  firebaseUid?: string;
  purchasedCourses?: string[];
  purchased?: string[];
  courses?: {
    purchased?: string[];
  };
  progress?: Progress;
  consent?: {
    acceptTerms: boolean;
    consent1: boolean;
    consent2: boolean;
    timestamp: string;
  };
  products?: {
    [productId: string]: {
      activated: boolean;
      activatedAt: Date;
      productKey: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  role: 'user' | 'admin';
  stripeCustomerId?: string;
  activeMembership?: boolean;
  membershipEndDate?: Date;
  becomePartner?: boolean;
} 