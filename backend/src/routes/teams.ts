// backend/src/routes/teams.ts
import { Router } from 'express';
import { body, param } from 'express-validator';
import * as teamsController from '../controllers/teamsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Validatori Aggiornati
const createTeamValidation = [
  body('name')
    .isLength({ min: 3, max: 50 })
    .withMessage('Il nome del team deve essere tra 3 e 50 caratteri'),
  body('leagueId')
    .isUUID()
    .withMessage('ID lega non valido'),
  body('riderIds')
    .isArray({ min: 9, max: 9 }) // Richiede esattamente 9 piloti
    .withMessage('Devi selezionare esattamente 9 piloti (3 per categoria)'),
  body('riderIds.*')
    .isUUID()
    .withMessage('ID pilota non valido'),
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
// Le rotte PUT e DELETE sono temporaneamente disabilitate in attesa della logica di mercato
// router.put('/:id', teamIdValidation, teamsController.updateTeam);
// router.delete('/:id', teamIdValidation, teamsController.deleteTeam);

export default router;