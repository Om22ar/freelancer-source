import { Router } from 'express';
import { getConversations, getMessages, sendMessage } from '../controllers/messagesController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get all conversations for the logged-in user
router.get('/conversations', authenticate, getConversations);

// Get messages for a specific contract conversation
router.get('/conversations/:contractId', authenticate, getMessages);

// Send a message (REST fallback, prefer Socket.io)
router.post('/', authenticate, sendMessage);

export default router;
