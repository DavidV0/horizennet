import * as functions from 'firebase-functions';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment-specific variables
const envPath = process.env.NODE_ENV === 'development' 
  ? path.resolve(__dirname, '../../.env.development')
  : path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath });

export const config = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || functions.config().stripe.secret_key || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe.webhook_secret || '',
  },
  email: {
    host: "w01ef01f.kasserver.com",
    port: 587,
    secure: false,
    name: process.env.EMAIL_NAME,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
  },
  cors: {
    origins: [
      'https://horizonnet-ed13d.web.app',
      'https://horizonnet-consulting.at',
      'http://localhost:4200'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    maxAge: 86400 // 24 hours
  },
  baseUrl: process.env.NODE_ENV === 'production' 
    ? "https://horizonnet-consulting.at"
    : "http://localhost:4200",
  firebase: {
    projectId: 'horizonnet-ed13d',
    storageBucket: 'horizonnet-ed13d.firebasestorage.app',
  }
}; 