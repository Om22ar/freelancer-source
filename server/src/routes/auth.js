import { Router } from 'express';
const router = Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  res.json({ message: 'TODO: Register user' });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  res.json({ message: 'TODO: Login user' });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'TODO: Logout user' });
});

// GET /api/auth/google
router.get('/google', (req, res) => {
  res.json({ message: 'TODO: Google OAuth' });
});

export default router;
