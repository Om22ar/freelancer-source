import { Router } from 'express';
import { submitBid, getBidsForJob, acceptBid, withdrawBid } from '../controllers/bidsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Submit a bid (freelancer only)
router.post('/', authenticate, authorize('freelancer'), submitBid);

// Get all bids for a job (job owner only)
router.get('/job/:jobId', authenticate, getBidsForJob);

// Accept a bid (client only)
router.put('/:id/accept', authenticate, authorize('client'), acceptBid);

// Withdraw a bid (freelancer only)
router.delete('/:id', authenticate, authorize('freelancer'), withdrawBid);

export default router;
