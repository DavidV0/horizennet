import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import express, { Request, Response } from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { stripeRoutes } from './stripe.routes';
import { webhookController } from '../controllers/webhook.controller';

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialize Express app
const app: express.Application = express();

// Configure CORS options
const corsOptions = {
  origin: [
    'https://horizonnet-ed13d.web.app',
    'https://horizonnet-consulting.at',
    'http://localhost:4200'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Configure body parsing middleware for non-webhook routes
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook' || req.originalUrl === '/api/webhook') {
    next(); // Let the raw body pass through for webhooks
  } else {
    express.json()(req, res, next);
  }
});

// Add raw body parser specifically for webhook routes
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use('/api/webhook', express.raw({ type: 'application/json' }));

// Register webhook routes (handle both paths)
app.post(
  "/webhook",
  webhookController.handleWebhook
);

app.post(
  "/api/webhook",
  webhookController.handleWebhook
);

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// Test route to verify the API is working
app.get('/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Mount Stripe routes
app.use('/stripe', stripeRoutes);

// Add error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err instanceof Error ? err.message : String(err)
  });
});

// Export the Express app wrapped in functions.https.onRequest
export const api = onRequest({
  timeoutSeconds: 300,
  memory: '256MiB',
  minInstances: 0,
  maxInstances: 10,
  cors: true
}, app);