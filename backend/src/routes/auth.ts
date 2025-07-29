// backend/src/routes/auth.ts
import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Validatori
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email non valida'),
  body('username')
    .isLength({ min: 3, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username deve essere 3-20 caratteri, solo lettere, numeri e underscore'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password deve essere almeno 6 caratteri')
];

const loginValidation = [
  body('emailOrUsername')
    .notEmpty()
    .withMessage('Email o username richiesto'),
  body('password')
    .notEmpty()
    .withMessage('Password richiesta')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Password corrente richiesta'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Nuova password deve essere almeno 6 caratteri')
];

// Routes pubbliche
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// Routes protette (richiedono autenticazione)
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, changePasswordValidation, authController.changePassword);

export default router;