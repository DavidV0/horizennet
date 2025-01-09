import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { firstValueFrom } from 'rxjs';

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
  status: 'pending_activation' | 'active';
  keyActivated: boolean;
  accountActivated: boolean;
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
        createdAt: new Date()
      });
      console.log('Product key document created successfully');

      // Send purchase confirmation email
      console.log('Sending purchase confirmation email...');
      const sendEmail = this.functions.httpsCallable('sendPurchaseConfirmation');
      const result = await sendEmail({
        email: userData.email,
        productKey: userData.productKey,
        firstName: userData.firstName,
        lastName: userData.lastName
      });
      console.log('Email sending result:', result);

      return userData.productKey;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  async activateProductKey(productKey: string, acceptedTerms: boolean) {
    if (!acceptedTerms) {
      throw new Error('Terms must be accepted to activate the product');
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

      // Generate password and create or get Firebase Auth user
      const password = Math.random().toString(36).slice(-8);
      let user;
      let isNewUser = true;
      
      try {
        // Try to create new user
        const userCredential = await this.auth.createUserWithEmailAndPassword(keyData.email, password);
        user = userCredential.user;
      } catch (authError: any) {
        isNewUser = false;
        // If user already exists, try to sign in
        if (authError.code === 'auth/email-already-in-use') {
          // Check if user exists in our database
          const existingUser = await this.checkIfUserExists(keyData.email);
          if (existingUser) {
            throw new Error('Diese E-Mail-Adresse wurde bereits aktiviert. Bitte verwenden Sie die Anmeldedaten aus Ihrer Aktivierungs-E-Mail.');
          }
          
          // If user exists in Auth but not in our database, proceed with existing auth user
          const currentUser = await this.auth.currentUser;
          if (!currentUser) {
            throw new Error('Bitte melden Sie sich mit Ihrer E-Mail-Adresse an, um den Produktschlüssel zu aktivieren.');
          }
          user = currentUser;
        } else {
          throw authError;
        }
      }
      
      if (!user) {
        throw new Error('Failed to create or get user account');
      }

      // Create user document
      const userData = {
        firstName: keyData.firstName,
        lastName: keyData.lastName,
        email: keyData.email,
        street: keyData.street,
        streetNumber: keyData.streetNumber,
        zipCode: keyData.zipCode,
        city: keyData.city,
        country: keyData.country,
        mobile: keyData.mobile,
        paymentPlan: keyData.paymentPlan,
        purchaseDate: keyData.purchaseDate,
        productKey: productKey,
        status: 'active',
        keyActivated: true,
        accountActivated: false,
        firebaseUid: user.uid,
        activatedAt: new Date()
      };

      // Create user document
      await this.firestore.collection('users').doc(user.uid).set(userData);

      // Update product key status
      await this.firestore.collection('productKeys').doc(productKey).update({
        status: 'active',
        keyActivated: true,
        activatedAt: new Date(),
        firebaseUid: user.uid
      });

      // Send confirmation email with login credentials only if new user was created
      if (isNewUser) {
        try {
          const sendEmail = this.functions.httpsCallable('sendActivationConfirmation');
          const result = await firstValueFrom(sendEmail({
            email: keyData.email,
            password: password,
            firstName: keyData.firstName,
            lastName: keyData.lastName
          }));
        } catch (error: any) {
          console.error('Error sending activation email:', error);
        }
      } else {
      }

      return true;
    } catch (error: any) {
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
} 