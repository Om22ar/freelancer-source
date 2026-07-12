import { Router } from 'express';
const router = Router();

router.get('/user/:userId', (req, res) => res.json({ message: 'TODO: Get user reviews' }));
router.post('/', (req, res) => res.json({ message: 'TODO: Create review' }));

export default router;
