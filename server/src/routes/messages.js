import { Router } from 'express';
const router = Router();

router.get('/conversations', (req, res) => res.json({ message: 'TODO: List conversations' }));
router.get('/conversations/:id', (req, res) => res.json({ message: 'TODO: Get messages' }));
router.post('/', (req, res) => res.json({ message: 'TODO: Send message' }));

export default router;
