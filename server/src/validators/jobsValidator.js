import { body } from 'express-validator';

export const createJobRules = [
  body('title')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be 10-200 characters'),
  body('description')
    .trim()
    .isLength({ min: 50 })
    .withMessage('Description must be at least 50 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('skillsRequired')
    .isArray({ min: 1 })
    .withMessage('At least one skill is required'),
  body('budgetMin')
    .isFloat({ min: 5 })
    .withMessage('Minimum budget must be at least $5'),
  body('budgetMax')
    .isFloat({ min: 5 })
    .withMessage('Maximum budget must be at least $5')
    .custom((value, { req }) => {
      if (Number(value) < Number(req.body.budgetMin)) {
        throw new Error('Maximum budget must be greater than minimum');
      }
      return true;
    }),
  body('budgetType')
    .isIn(['fixed', 'hourly'])
    .withMessage('Budget type must be fixed or hourly'),
  body('duration')
    .optional()
    .trim()
    .isLength({ max: 50 })
];

export const updateJobRules = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be 10-200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 50 })
    .withMessage('Description must be at least 50 characters'),
  body('status')
    .optional()
    .isIn(['open', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid status')
];
