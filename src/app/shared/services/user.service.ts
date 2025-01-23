import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { firstValueFrom } from 'rxjs';
import { ShopProduct } from '../interfaces/shop-product.interface';
import firebase from 'firebase/compat/app';

export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  street: string;
  streetNumber: string;
  zipCode: string;
  city: string;
  country: string;
  mobile: string;
  paymentPlan: number;
  purchaseDate: Date;
  productKey: string;
  status: string;
  keyActivated: boolean;
  accountActivated: boolean;
  becomePartner?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  purchasedCourses?: string[];
  productType?: string;
}

interface ConsentData {
  acceptTerms: boolean;
  consent1: boolean;
  consent2: boolean;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private functions: AngularFireFunctions
  ) {}

  async getCurrentUser() {
    return await this.auth.currentUser;
  }

  async createUserWithEmailAndPassword(email: string, password: string) {
    return await this.auth.createUserWithEmailAndPassword(email, password);
  }

  async createUser(userData: UserData) {
    console.log('Starting createUser with data:', userData);
    
    try {
      // Create a product key document with user data only
      console.log('Creating product key document...');
      await this.firestore.collection('productKeys').doc(userData.productKey).set({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        street: userData.street,
        streetNumber: userData.streetNumber,
        zipCode: userData.zipCode,
        city: userData.city,
        country: userData.country,
        mobile: userData.mobile,
        paymentPlan: userData.paymentPlan,
        purchaseDate: new Date(),
        status: 'pending_activation',
        keyActivated: false,
        createdAt: new Date(),
        becomePartner: userData.becomePartner || false,
        purchasedCourses: userData.purchasedCourses || [],
        productType: userData.productType || 'crypto'
      });
      console.log('Product key document created successfully');

      // Send purchase confirmation email
      console.log('Sending purchase confirmation email...');
      const sendEmail = this.functions.httpsCallable('sendPurchaseConfirmation');
      const result = await sendEmail({
        email: userData.email,
        productKey: userData.productKey,
        firstName: userData.firstName,
        lastName: userData.lastName,
        becomePartner: userData.becomePartner || false
      });
      console.log('Email sending result:', result);

      return userData.productKey;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  async activateProductKey(productKey: string, consent: ConsentData) {
    if (!consent.acceptTerms || !consent.consent1 || !consent.consent2) {
      throw new Error('Alle Zustimmungen müssen akzeptiert werden');
    }

    try {
      // Check if product key exists and is valid
      const keyDoc = await this.firestore.collection('productKeys').doc(productKey).get().toPromise();
      if (!keyDoc?.exists) {
        throw new Error('Invalid product key');
      }

      const keyData = keyDoc.data() as any;
      
      if (keyData.keyActivated) {
        throw new Error('Dieser Produktschlüssel wurde bereits aktiviert.');
      }

      // Check for email in customerEmail field first, then fall back to email field
      const email = keyData.customerEmail || keyData.email;
      
      if (!email) {
        throw new Error('Keine E-Mail-Adresse für diesen Produktschlüssel gefunden.');
      }

      // Get course IDs from the product key document
      let courseIds = keyData.courseIds || [];

      if (!courseIds || courseIds.length === 0) {
        // Try to get course IDs from customer document as fallback
        if (keyData.customerId && keyData.productId) {
          const customerDoc = await this.firestore.collection('customers').doc(keyData.customerId).get().toPromise();
          if (customerDoc?.exists) {
            const customerData = customerDoc.data() as any;
            if (customerData?.products?.[keyData.productId]?.courseIds) {
              courseIds = customerData.products[keyData.productId].courseIds;
            }
          }
        }

        // If still no course IDs and it's a crypto product, assign default crypto course
        if ((!courseIds || courseIds.length === 0) && keyData.productType === 'crypto') {
          const cryptoCourseId = 'GMrcDhUa9rQQ7C5lm404'; // Default crypto course ID
          courseIds = [cryptoCourseId];
        }
      }

      // Update keyData.email to ensure it's available for the rest of the process
      keyData.email = email;

      // Generate password and create or get Firebase Auth user
      const password = Math.random().toString(36).slice(-8);
      let user;
      let isNewUser = true;

      // First check if there's a currently logged in user
      const currentUser = await this.auth.currentUser;
      if (currentUser) {
        // If the current user's email matches the product key email, use that user
        if (currentUser.email === keyData.email) {
          user = currentUser;
          isNewUser = false;
        } else {
          // If emails don't match, sign out the current user
          await this.auth.signOut();
        }
      }

      // If no user yet, try to create one
      if (!user) {
        try {
          const userCredential = await this.auth.createUserWithEmailAndPassword(keyData.email, password);
          user = userCredential.user;
        } catch (authError: any) {
          isNewUser = false;
          if (authError.code === 'auth/email-already-in-use') {
            // Check if user exists in our database
            const existingUser = await this.checkIfUserExists(keyData.email);
            if (existingUser) {
              throw new Error('Diese E-Mail-Adresse wurde bereits aktiviert. Bitte verwenden Sie die Anmeldedaten aus Ihrer Aktivierungs-E-Mail.');
            }
            
            // If user exists in Auth but not in our database, try to sign in
            try {
              const userCredential = await this.auth.signInWithEmailAndPassword(keyData.email, password);
              user = userCredential.user;
            } catch (signInError) {
              throw new Error('Bitte melden Sie sich mit Ihrer E-Mail-Adresse an, um den Produktschlüssel zu aktivieren.');
            }
          } else {
            throw authError;
          }
        }
      }

      if (!user) {
        throw new Error('Failed to create or get user account');
      }

      // Create user document with consent data and course IDs
      const userData = {
        firstName: keyData.firstName || '',
        lastName: keyData.lastName || '',
        email: email,
        street: keyData.street || '',
        streetNumber: keyData.streetNumber || '',
        zipCode: keyData.zipCode || '',
        city: keyData.city || '',
        country: keyData.country || '',
        mobile: keyData.mobile || '',
        paymentPlan: keyData.paymentPlan || 0,
        purchaseDate: keyData.purchaseDate || new Date(),
        productKey: productKey,
        status: 'active',
        keyActivated: true,
        accountActivated: false,
        firebaseUid: user.uid,
        activatedAt: new Date(),
        consent: {
          acceptTerms: consent.acceptTerms,
          consent1: consent.consent1,
          consent2: consent.consent2,
          timestamp: consent.timestamp
        },
        courses: {
          purchased: courseIds,
          progress: {}
        }
      };

      // Create user document
      await this.firestore.collection('users').doc(user.uid).set(userData);

      // Create or update user_courses document with user ID
      await this.firestore.collection('user_courses').doc(user.uid).set({
        courseIds: courseIds,
        userId: user.uid,
        email: email,
        updatedAt: new Date()
      }, { merge: true });

      // Update product key status with consent data
      await this.firestore.collection('productKeys').doc(productKey).update({
        status: 'active',
        keyActivated: true,
        activatedAt: new Date(),
        firebaseUid: user.uid,
        email: email,
        consent: {
          acceptTerms: consent.acceptTerms,
          consent1: consent.consent1,
          consent2: consent.consent2,
          timestamp: consent.timestamp
        }
      });

      // Send confirmation email with login credentials only if new user was created
      if (isNewUser) {
        try {
          const sendEmail = this.functions.httpsCallable('sendActivationConfirmation');
          await firstValueFrom(sendEmail({
            email: keyData.email,
            password: password,
            firstName: keyData.firstName,
            lastName: keyData.lastName,
            userId: user.uid,
            productType: keyData.productType || 'crypto'
          }));
        } catch (error: any) {
          console.error('Error sending activation email:', error);
        }
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async activateAccount(userId: string) {
    try {
      await this.firestore.collection('users').doc(userId).update({
        accountActivated: true,
        status: 'active'
      });
      return true;
    } catch (error) {
      console.error('Error activating account:', error);
      throw error;
    }
  }

  async checkIfUserExists(email: string): Promise<boolean> {
    try {
      const usersSnapshot = await this.firestore
        .collection('users', ref => ref.where('email', '==', email))
        .get()
        .toPromise();

      return !!(usersSnapshot && usersSnapshot.docs.length > 0);
    } catch (error) {
      console.error('Error checking user existence:', error);
      throw error;
    }
  }

  async updateUserSubscription(productKey: string, subscriptionId: string) {
    try {
      await this.firestore.collection('productKeys').doc(productKey).update({
        stripeSubscriptionId: subscriptionId
      });
    } catch (error) {
      console.error('Error updating user subscription:', error);
      throw error;
    }
  }

  async activateProductAccess(customerId: string, productKey: string, product: ShopProduct) {
    try {
      // Ensure we're authenticated
      const currentUser = await this.auth.currentUser;
      if (!currentUser) {
        // Sign in anonymously if no user is signed in
        await this.auth.signInAnonymously();
      }

      // Create or update product key document with all necessary data
      const productKeyData = {
        isActivated: false,
        customerId,
        productId: product.id,
        createdAt: new Date(),
        courseIds: product.courseIds || [],
        status: 'pending_activation',
        purchaseDate: new Date(),
        productType: product.tag === 'crypto' || product.name.toLowerCase().includes('crypto') ? 'crypto' : undefined
      };

      if (productKeyData.productType === 'crypto' && (!productKeyData.courseIds || productKeyData.courseIds.length === 0)) {
        productKeyData.courseIds = ['GMrcDhUa9rQQ7C5lm404']; // Default crypto course ID
      }

      await this.firestore.collection('productKeys').doc(productKey).set(productKeyData, { merge: true });

      // Create or update customer's document with product access
      const customerData = {
        [`products.${product.id}`]: {
          activated: false,
          productKey,
          createdAt: new Date(),
          courseIds: productKeyData.courseIds
        }
      };

      await this.firestore.collection('customers').doc(customerId).set(customerData, { merge: true });

      return true;
    } catch (error) {
      throw error;
    }
  }
} 