import { Router } from 'express';
import { getConversations, getMessages, sendMessage } from '../controllers/messagesController.js';
import { authenticate } from '../middleware/auth.js';
import { messageLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Get all conversations for the logged-in user
router.get('/conversations', authenticate, getConversations);

// Get messages for a specific contract conversation
router.get('/conversations/:contractId', authenticate, getMessages);

// Send a message (REST fallback, rate limited: 30/min)
router.post('/', authenticate, messageLimiter, sendMessage);

export default router;
