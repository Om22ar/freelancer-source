import { body } from 'express-validator';

export const submitBidRules = [
  body('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  body('amount')
    .isFloat({ min: 5 })
    .withMessage('Bid amount must be at least $5'),
  body('deliveryTime')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Delivery time is required'),
  body('proposal')
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Proposal must be 20-5000 characters')
];
