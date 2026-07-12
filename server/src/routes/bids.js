import { Router } from 'express';
const router = Router();

router.get('/job/:jobId', (req, res) => res.json({ message: 'TODO: List bids for job' }));
router.post('/', (req, res) => res.json({ message: 'TODO: Submit bid' }));
router.put('/:id/accept', (req, res) => res.json({ message: 'TODO: Accept bid' }));
router.delete('/:id', (req, res) => res.json({ message: 'TODO: Withdraw bid' }));

export default router;
