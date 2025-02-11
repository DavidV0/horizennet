import { Router } from 'express';
import { contactController } from '../controllers/contact.controller';

const router = Router();

router.post('/sendContactForm', contactController.handleContactForm);

export const contactRoutes = router; 