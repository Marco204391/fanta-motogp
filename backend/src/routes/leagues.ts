// backend/src/routes/leagues.ts
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as leaguesController from '../controllers/leaguesController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// Validatori
const createLeagueValidation = [
  body('name')
    .isLength({ min: 3, max: 50 })
    .withMessage('Nome lega deve essere tra 3 e 50 caratteri'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate deve essere un booleano'),
  body('maxTeams')
    .optional()
    .isInt({ min: 2, max: 20 })
    .withMessage('Numero massimo team deve essere tra 2 e 20'),
  body('budget')
    .optional()
    .isInt({ min: 1000000 })
    .withMessage('Budget minimo 1.000.000'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Data inizio non valida'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Data fine non valida')
];

const joinLeagueValidation = [
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('Codice lega deve essere di 6 caratteri')
];

const leagueIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID lega non valido')
];

const publicLeaguesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Pagina deve essere un numero positivo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limite deve essere tra 1 e 50')
];

// Routes pubbliche
router.get('/public', publicLeaguesValidation, leaguesController.getPublicLeagues);
router.get('/:id', leagueIdValidation, optionalAuth, leaguesController.getLeagueById);
router.get('/:id/standings', leagueIdValidation, leaguesController.getLeagueStandings);

// Routes protette (richiedono autenticazione)
router.get('/my-leagues', authenticate, leaguesController.getMyLeagues);
router.post('/', authenticate, createLeagueValidation, leaguesController.createLeague);
router.post('/join', authenticate, joinLeagueValidation, leaguesController.joinLeague);
router.post('/:id/leave', authenticate, leagueIdValidation, leaguesController.leaveLeague);

export default router;