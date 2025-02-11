import * as admin from 'firebase-admin';
import { onRequest, HttpsOptions } from 'firebase-functions/v2/https';
import { config } from '../config';
import { routes } from './index';
import { corsMiddleware } from '../middleware/cors.middleware';
import { webhookController } from '../controllers/webhook.controller';
import express from "express";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: config.firebase.projectId,
    storageBucket: config.firebase.storageBucket,
    credential: admin.credential.applicationDefault()
  });
}

// Ensure we're using production email settings in emulator
process.env.FUNCTIONS_EMULATOR = "false";

// Initialize Express app
const app = express();

// Apply CORS middleware
app.use(corsMiddleware);

// Register webhook route first, before any body parsers
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }), // Ensure raw body is retained as Buffer
  webhookController.handleWebhook
);

// Apply JSON body parsing for all other routes
app.use(express.json());

// Mount the router with /api prefix
app.use('/api', routes);

// Export the Express app wrapped in functions.https.onRequest
export const api = onRequest(
  {
    timeoutSeconds: 300,
    memory: "256MiB",
    minInstances: 0,
    maxInstances: 10,
    cors: true,
    rawBody: true
  } as HttpsOptions,
  app
);