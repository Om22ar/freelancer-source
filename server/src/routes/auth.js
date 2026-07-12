import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { googleCallback } from '../controllers/oauthController.js';
import { registerRules, loginRules } from '../validators/authValidator.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import passport from '../config/passport.js';

const router = Router();

// Email/password auth
router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.get('/me', authenticate, getMe);

// Google OAuth
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
}));

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login?error=oauth_failed'
  }),
  googleCallback
);

export default router;
