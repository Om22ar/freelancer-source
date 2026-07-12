import { Router } from 'express';
import { createJob, getJobs, getJob, updateJob, deleteJob, getMyJobs } from '../controllers/jobsController.js';
import { createJobRules, updateJobRules } from '../validators/jobsValidator.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Public routes
router.get('/', getJobs);

// Protected routes (must be above /:id to avoid being swallowed)
router.get('/me/listings', authenticate, getMyJobs);
router.post('/', authenticate, authorize('client'), createJobRules, validate, createJob);

// Parameterized routes
router.get('/:id', getJob);
router.put('/:id', authenticate, updateJobRules, validate, updateJob);
router.delete('/:id', authenticate, deleteJob);

export default router;
