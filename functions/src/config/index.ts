import * as functions from 'firebase-functions';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Determine the correct .env file path
const envPath = path.resolve(__dirname, '../../.env');

// Only try to load .env if it exists
if (fs.existsSync(envPath)) {
  console.log('Loading environment variables from:', envPath);
  dotenv.config({ path: envPath });
} else {
  console.warn('No .env file found at:', envPath);
}

console.log('Environment:', process.env.NODE_ENV);
console.log('Email config:', {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  user: process.env.EMAIL_USER,
  name: process.env.EMAIL_NAME
});

export const config = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || functions.config().stripe.secret_key || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe.webhook_secret || '',
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    name: process.env.EMAIL_NAME,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    tls: {
      rejectUnauthorized: false
    }
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