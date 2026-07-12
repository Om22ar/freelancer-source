import { body } from 'express-validator';

export const registerRules = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter'),
  body('firstName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Last name is required'),
  body('role')
    .optional()
    .isIn(['client', 'freelancer'])
    .withMessage('Role must be client or freelancer')
];

export const loginRules = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];
