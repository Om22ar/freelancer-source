import { Router } from 'express';
import { generateInvoice, getInvoices } from '../controllers/invoiceController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getInvoices);
router.get('/:paymentId', authenticate, generateInvoice);

export default router;
