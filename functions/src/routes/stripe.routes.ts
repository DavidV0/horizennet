import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { paymentController } from '../controllers/payment.controller';
import { subscriptionController } from '../controllers/subscription.controller';
import { RequestHandler } from 'express';

const router = Router();

// Customer routes
router.post("/customers", customerController.createCustomer as unknown as RequestHandler);
router.get("/customers/:customerId", customerController.getCustomer as unknown as RequestHandler);

// Product routes
router.post('/products', paymentController.createProduct as unknown as RequestHandler);
router.post('/products/:productId/prices', paymentController.updateProductPrices as unknown as RequestHandler);
router.post('/products/:productId/deactivate-prices', paymentController.deactivatePrices as unknown as RequestHandler);
router.post('/products/:productId/activate-prices', paymentController.activatePrices as unknown as RequestHandler);

// Payment routes
router.post("/payments", paymentController.createPaymentIntent as unknown as RequestHandler);
router.post("/checkout-session", paymentController.createCheckoutSession as unknown as RequestHandler);
router.get("/payments/:paymentIntentId", paymentController.getPaymentIntent as unknown as RequestHandler);
router.post("/payments/:paymentIntentId/retry", paymentController.retryPayment as unknown as RequestHandler);
router.post("/payments/:paymentIntentId/capture", paymentController.capturePayment as unknown as RequestHandler);
router.post("/setup-intent", paymentController.createSetupIntent as unknown as RequestHandler);

// Subscription routes
router.post("/subscriptions", subscriptionController.createSubscription as unknown as RequestHandler);
router.get("/subscriptions/:subscriptionId", subscriptionController.getSubscriptionStatus as unknown as RequestHandler);
router.delete("/subscriptions/:subscriptionId", subscriptionController.cancelSubscription as unknown as RequestHandler);
router.post("/subscriptions/:subscriptionId/handle-failed-payment", subscriptionController.handleFailedPayment as unknown as RequestHandler);
router.post("/subscriptions/:subscriptionId/reminder", subscriptionController.sendRenewalReminder as unknown as RequestHandler);
router.post("/subscriptions/:subscriptionId/payment-method", subscriptionController.updatePaymentMethod as unknown as RequestHandler);

// Add error handling middleware
router.use((err: any, req: any, res: any, next: any) => {
  console.error('Route error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err instanceof Error ? err.message : String(err)
  });
});

export const stripeRoutes = router; 