import * as admin from 'firebase-admin';
import { PurchaseConfirmationData } from '../types';

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const generateProductKey = async (): Promise<string> => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `HN-${timestamp}-${random}`;
};

export const checkIfUserExists = async (email: string): Promise<boolean> => {
  const usersSnapshot = await admin.firestore()
    .collection('users')
    .where('email', '==', email)
    .get();
  return !usersSnapshot.empty;
};

export const storeInitialProductKey = async (productKey: string, data: PurchaseConfirmationData) => {
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
    purchaseDate: new Date(),
    createdAt: new Date(),
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
    status: 'active',
  };

  await admin.firestore().collection('productKeys').doc(productKey).set(productKeyData);
  return productKeyData;
}; 