import { Router } from 'express';
import express from 'express';
import { createEscrowPayment, releasePayment, refundPayment, getPaymentHistory, handleWebhook } from '../controllers/paymentsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Stripe webhook (must use raw body, no JSON parsing)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
router.post('/escrow', authenticate, authorize('client'), createEscrowPayment);
router.post('/:paymentId/release', authenticate, authorize('client'), releasePayment);
router.post('/:paymentId/refund', authenticate, authorize('client'), refundPayment);
router.get('/history', authenticate, getPaymentHistory);

export default router;
