import * as nodemailer from 'nodemailer';
import { config } from '../config';
import { EmailOptions } from '../types';

export const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  name: config.email.name,
  auth: {
    user: config.email.user,
    pass: config.email.password
  },
  tls: {
    rejectUnauthorized: false
  },
  pool: true,
  maxConnections: 1,
  rateDelta: 20000,
  rateLimit: 5
});

// Verify transporter
transporter.verify(function(error, success) {
  if (error) {
    console.error('Transporter verification failed:', error);
  } else {
    console.log('Transporter is ready to send emails');
  }
});

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  await transporter.sendMail({
    from: {
      name: "HorizonNet Consulting",
      address: config.email.user || ''
    },
    to: options.to,
    subject: options.subject,
    html: options.template,
    text: options.template.replace(/<[^>]*>/g, ''),
    headers: {
      'List-Unsubscribe': `<mailto:${config.email.user}>`,
      'X-Entity-Ref-ID': Date.now().toString()
    }
  });
}; 