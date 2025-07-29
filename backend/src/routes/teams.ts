// backend/src/routes/teams.ts
import { Router } from 'express';
import { body, param } from 'express-validator';
import * as teamsController from '../controllers/teamsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Validatori
const createTeamValidation = [
  body('name')
    .isLength({ min: 3, max: 50 })
    .withMessage('Nome team deve essere tra 3 e 50 caratteri'),
  body('leagueId')
    .isUUID()
    .withMessage('ID lega non valido'),
  body('riderIds')
    .isArray({ min: 1, max: 5 })
    .withMessage('Devi selezionare da 1 a 5 piloti'),
  body('riderIds.*')
    .isUUID()
    .withMessage('ID pilota non valido'),
  body('captainId')
    .isUUID()
    .withMessage('ID capitano non valido')
];

const updateTeamValidation = [
  body('riderIds')
    .optional()
    .isArray({ min: 1, max: 5 })
    .withMessage('Devi selezionare da 1 a 5 piloti'),
  body('riderIds.*')
    .optional()
    .isUUID()
    .withMessage('ID pilota non valido'),
  body('captainId')
    .optional()
    .isUUID()
    .withMessage('ID capitano non valido')
];

const teamIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID team non valido')
];

// Tutte le route richiedono autenticazione
router.use(authenticate);

// Routes
router.get('/my-teams', teamsController.getMyTeams);
router.get('/:id', teamIdValidation, teamsController.getTeamById);
router.get('/:id/standings', teamIdValidation, teamsController.getTeamStandings);
router.post('/', createTeamValidation, teamsController.createTeam);
router.put('/:id', teamIdValidation, updateTeamValidation, teamsController.updateTeam);
router.delete('/:id', teamIdValidation, teamsController.deleteTeam);

export default router;