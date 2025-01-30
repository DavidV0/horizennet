import { Progress } from './progress.model';

export interface User {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  street: string;
  streetNumber: string;
  zipCode: string;
  city: string;
  country: string;
  mobile: string;
  photoURL?: string;
  purchasedCourses: string[];
  isSalesPartner: boolean;
  progress: Progress;
  status?: 'active' | 'inactive';
  accountActivated?: boolean;
  paymentPlan: number;
  purchaseDate: Date;
  productKey: string;
  keyActivated: boolean;
  activatedAt?: Date;
  firebaseUid?: string;
  purchased?: string[];
  courses?: {
    purchased?: string[];
  };
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
  role: 'user' | 'admin';
  stripeCustomerId?: string;
  activeMembership?: boolean;
  membershipEndDate?: Date;
  becomePartner?: boolean;
  createdAt?: any;
  updatedAt?: any;
} 