import { Router } from 'express';
import { createPaymentIntent, confirmPayment, releasePayment, requestRefund, getPaymentHistory } from '../controllers/paymentsController.js';
import { handleStripeWebhook } from '../controllers/webhookController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import express from 'express';

const router = Router();

// Stripe webhook (raw body required for signature verification)
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Protected payment routes
router.post('/create-intent', authenticate, authorize('client'), createPaymentIntent);
router.post('/confirm', authenticate, authorize('client'), confirmPayment);
router.post('/release', authenticate, authorize('client'), releasePayment);
router.post('/refund', authenticate, authorize('client'), requestRefund);
router.get('/history', authenticate, getPaymentHistory);

export default router;
