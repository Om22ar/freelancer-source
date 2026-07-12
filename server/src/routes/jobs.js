import { Router } from 'express';
import { createJob, getJobs, getJob, updateJob, deleteJob, getMyJobs } from '../controllers/jobsController.js';
import { createJobRules, updateJobRules } from '../validators/jobsValidator.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Public routes
router.get('/', getJobs);
router.get('/:id', getJob);

// Protected routes (must be logged in)
router.get('/me/listings', authenticate, getMyJobs);
router.post('/', authenticate, authorize('client'), createJobRules, validate, createJob);
router.put('/:id', authenticate, updateJobRules, validate, updateJob);
router.delete('/:id', authenticate, deleteJob);

export default router;
