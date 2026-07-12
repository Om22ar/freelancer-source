import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => res.json({ message: 'TODO: List jobs' }));
router.get('/:id', (req, res) => res.json({ message: 'TODO: Get job detail' }));
router.post('/', (req, res) => res.json({ message: 'TODO: Create job' }));
router.put('/:id', (req, res) => res.json({ message: 'TODO: Update job' }));
router.delete('/:id', (req, res) => res.json({ message: 'TODO: Delete job' }));

export default router;
