import { Router } from 'express';
import { submitBid, getBidsForJob, acceptBid, withdrawBid } from '../controllers/bidsController.js';
import { submitBidRules } from '../validators/bidsValidator.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Submit a bid (freelancer only, validated)
router.post('/', authenticate, authorize('freelancer'), submitBidRules, validate, submitBid);

// Get all bids for a job (job owner only)
router.get('/job/:jobId', authenticate, getBidsForJob);

// Accept a bid (client only)
router.put('/:id/accept', authenticate, authorize('client'), acceptBid);

// Withdraw a bid (freelancer only)
router.delete('/:id', authenticate, authorize('freelancer'), withdrawBid);

export default router;
