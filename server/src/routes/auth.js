import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { registerRules, loginRules } from '../validators/authValidator.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', registerRules, validate, register);

// POST /api/auth/login
router.post('/login', loginRules, validate, login);

// GET /api/auth/me (protected)
router.get('/me', authenticate, getMe);

export default router;
