import * as admin from 'firebase-admin';
import { config } from './config';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: config.firebase.projectId,
    storageBucket: config.firebase.storageBucket,
    credential: admin.credential.applicationDefault()
  });
}

// Export all cloud functions
export { api } from './routes/api';
export { sendActivationConfirmation, activateProduct } from './functions/activation.functions';
export { sendPurchaseConfirmation } from './functions/purchase.functions'; 