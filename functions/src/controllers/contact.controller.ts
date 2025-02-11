import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { ContactFormData } from '../types';
import { transporter } from '../services/email.service';
import { escapeHtml } from '../utils';

export const contactController = {
  handleContactForm: async (req: Request, res: Response) => {
    try {
      const data = req.body as ContactFormData;
      console.log('Received contact form data:', data);
      
      // Validate input data
      if (!data.firstName || !data.lastName || !data.email || !data.message) {
        console.log('Missing required fields:', { data });
        res.status(400).json({
          error: 'Alle Pflichtfelder müssen ausgefüllt sein.'
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        console.log('Invalid email format:', data.email);
        res.status(400).json({
          error: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
        });
        return;
      }

      // Send email to admin
      await transporter.sendMail({
        from: '"HorizonNet Kontaktformular" <office@horizonnet-consulting.at>',
        to: 'office@horizonnet-consulting.at',
        subject: 'Neue Kontaktanfrage',
        html: `
          <h2>Neue Kontaktanfrage von ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</h2>
          <p><strong>Name:</strong> ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</p>
          <p><strong>E-Mail:</strong> ${escapeHtml(data.email)}</p>
          <p><strong>Nachricht:</strong></p>
          <p>${escapeHtml(data.message)}</p>
          <p><strong>Zeitpunkt:</strong> ${new Date().toLocaleString('de-AT')}</p>
        `
      });

      // Send confirmation email to user
      await transporter.sendMail({
        from: '"HorizonNet Consulting" <office@horizonnet-consulting.at>',
        to: data.email,
        subject: 'Ihre Kontaktanfrage bei HorizonNet',
        html: `
          <h2>Vielen Dank für Ihre Kontaktanfrage!</h2>
          <p>Sehr geehrte(r) ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)},</p>
          <p>wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>
          <p>Ihre Nachricht:</p>
          <blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin: 10px 0;">
            ${escapeHtml(data.message)}
          </blockquote>
          <p>Mit freundlichen Grüßen,<br>Ihr HorizonNet Team</p>
        `
      });

      // Store in Firestore
      await admin.firestore().collection('contactRequests').add({
        ...data,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'new'
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error in sendContactForm:', error);
      res.status(500).json({
        error: 'Ein unerwarteter Fehler ist aufgetreten.',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}; 