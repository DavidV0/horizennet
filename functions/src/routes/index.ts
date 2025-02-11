import { Router } from 'express';
import { stripeRoutes } from './stripe.routes';
import { contactRoutes } from './contact.routes';

const router = Router();

// Mount routes
router.use('/stripe', stripeRoutes);
router.use('/', contactRoutes);

// Health check endpoint
router.get('/', (req, res) => {
  res.status(200).send('OK');
});

export const routes = router; 