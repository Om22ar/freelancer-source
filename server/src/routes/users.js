import { Router } from 'express';
const router = Router();

router.get('/:id', (req, res) => res.json({ message: 'TODO: Get user profile' }));
router.put('/:id', (req, res) => res.json({ message: 'TODO: Update profile' }));
router.get('/:id/portfolio', (req, res) => res.json({ message: 'TODO: Get portfolio' }));

export default router;
