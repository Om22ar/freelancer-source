import { Router } from 'express';
const router = Router();

router.post('/create-intent', (req, res) => res.json({ message: 'TODO: Create payment intent' }));
router.post('/release', (req, res) => res.json({ message: 'TODO: Release escrow payment' }));
router.get('/history', (req, res) => res.json({ message: 'TODO: Payment history' }));
router.post('/webhook', (req, res) => res.json({ message: 'TODO: Stripe webhook' }));

export default router;
