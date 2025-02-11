import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { paymentController } from '../controllers/payment.controller';
import { subscriptionController } from '../controllers/subscription.controller';
import { productController } from '../controllers/product.controller';

const router = Router();

// Customer routes
router.post("/customers", customerController.createCustomer);
router.get("/customers/:customerId", customerController.getCustomer);

// Payment routes
router.post("/payments", paymentController.createPaymentIntent);
router.post("/checkout-session", paymentController.createCheckoutSession);
router.get("/payments/:paymentIntentId", paymentController.getPaymentIntent);
router.post("/payments/:paymentIntentId/retry", paymentController.retryPayment);
router.post("/payments/:paymentIntentId/capture", paymentController.capturePayment);
router.post("/setup-intent", paymentController.createSetupIntent);

// Subscription routes
router.post("/subscriptions", subscriptionController.createSubscription);
router.get("/subscriptions/:subscriptionId", subscriptionController.getSubscriptionStatus);
router.delete("/subscriptions/:subscriptionId", subscriptionController.cancelSubscription);
router.post("/subscriptions/:subscriptionId/handle-failed-payment", subscriptionController.handleFailedPayment);
router.post("/subscriptions/:subscriptionId/reminder", subscriptionController.sendRenewalReminder);
router.post("/subscriptions/:subscriptionId/payment-method", subscriptionController.updatePaymentMethod);

// Product routes
router.post("/products/:productId/prices", productController.updateProductPrices);
router.post("/products/:productId/deactivate-prices", productController.deactivatePrices);
router.post("/products/:productId/activate-prices", productController.activatePrices);

export const stripeRoutes = router; 