import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { ActivationConfirmationData, ConsentData } from '../types';
import { sendEmail } from '../services/email.service';
import { checkIfUserExists } from '../utils';
import { config } from '../config';

// Send activation confirmation
export const sendActivationConfirmation = onCall<ActivationConfirmationData>({
  timeoutSeconds: 300,
  memory: '256MiB',
  minInstances: 0,
  maxInstances: 10,
  cors: config.cors.origins
}, async (request) => {
  try {
    const { email, password, firstName, lastName } = request.data;
    
    await sendEmail({
      to: email,
      subject: "Ihr Account wurde aktiviert",
      template: `
        <h1>Ihr Account wurde erfolgreich aktiviert!</h1>
        <p>Hallo ${firstName || ''} ${lastName || ''}</p>
        <p>Sie können sich nun mit folgenden Zugangsdaten einloggen:</p>
        <p><strong>E-Mail:</strong> ${email}</p>
        <p><strong>Passwort:</strong> ${password}</p>
        <p><strong>Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach dem ersten Login.</p>
        <p>Zum Login gelangen Sie hier:</p>
        <p><a href="${config.baseUrl}/login">Zum Login</a></p>
        <p>In Ihrem Kundendashboard finden Sie alle wichtigen Informationen und Dokumente.</p>
        <p>Mit freundlichen Grüßen,<br>Ihr HorizonNet Team</p>
      `,
      data: {}
    });

    return { success: true };
  } catch (error) {
    console.error('Error in activation:', error);
    return { error: 'Failed to activate products' };
  }
});

// Export the activateProduct function
export const activateProduct = onCall<{productKey: string, consent: ConsentData}>({
  timeoutSeconds: 300,
  memory: '256MiB',
  minInstances: 0,
  maxInstances: 10,
  cors: config.cors.origins
}, async (request) => {
  try {
    const { productKey, consent } = request.data;

    if (!consent.acceptTerms || !consent.consent1 || !consent.consent2) {
      throw new Error('Alle Zustimmungen müssen akzeptiert werden');
    }

    try {
      // Check if product key exists and is valid
      const keyDoc = await admin.firestore().collection('productKeys').doc(productKey).get();
      if (!keyDoc?.exists) {
        throw new Error('Invalid product key');
      }

      const keyData = keyDoc.data() as any;
      
      if (keyData.isActivated) {
        throw new Error('Dieser Produktschlüssel wurde bereits aktiviert.');
      }

      // Check for email in customerEmail field first, then fall back to email field
      const email = keyData.customerEmail || keyData.email;
      
      if (!email) {
        throw new Error('Keine E-Mail-Adresse für diesen Produktschlüssel gefunden.');
      }

      // Generate password and create or get Firebase Auth user
      const password = Math.random().toString(36).slice(-8);
      let user;
      let isNewUser = true;

      try {
        // Try to create user first
        const userRecord = await admin.auth().createUser({
          email: email,
          password: password,
          emailVerified: false
        });
        user = userRecord;
      } catch (authError: any) {
        isNewUser = false;
        if (authError.code === 'auth/email-already-exists') {
          // Check if user exists in our database
          const existingUser = await checkIfUserExists(email);
          if (existingUser) {
            throw new Error('Diese E-Mail-Adresse wurde bereits aktiviert. Bitte verwenden Sie die Anmeldedaten aus Ihrer Aktivierungs-E-Mail.');
          }
          
          // If user only exists in Auth, get user data
          const userRecord = await admin.auth().getUserByEmail(email);
          user = userRecord;
        } else {
          throw authError;
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
        purchasedCourses: keyData.courseIds || [],
        products: keyData.products || {},
        isSalesPartner: keyData.isSalesPartner || false
      };

      // Create user document
      await admin.firestore().collection('users').doc(user.uid).set(userData);

      // Update product key status with consent data
      await admin.firestore().collection('productKeys').doc(productKey).update({
        status: 'active',
        isActivated: true,
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
          await sendEmail({
            to: email,
            subject: "Ihr Account wurde aktiviert",
            template: `
              <h1>Ihr Account wurde erfolgreich aktiviert!</h1>
              <p>Hallo ${keyData.firstName || ''} ${keyData.lastName || ''}</p>
              <p>Sie können sich nun mit folgenden Zugangsdaten einloggen:</p>
              <p><strong>E-Mail:</strong> ${email}</p>
              <p><strong>Passwort:</strong> ${password}</p>
              <p><strong>Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach dem ersten Login.</p>
              <p>Zum Login gelangen Sie hier:</p>
              <p><a href="${config.baseUrl}/login">Zum Login</a></p>
              <p>In Ihrem Kundendashboard finden Sie alle wichtigen Informationen und Dokumente.</p>
              <p>Mit freundlichen Grüßen,<br>Ihr HorizonNet Team</p>
            `,
            data: {}
          });
        } catch (error: any) {
          console.error('Error sending activation email:', error);
        }
      }

      return { success: true, user };
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error in product activation:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to activate product' 
    };
  }
}); 