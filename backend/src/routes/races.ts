// backend/src/routes/races.ts
import { Router } from 'express';
import * as racesController from '../controllers/racesController';

const router = Router();

// Route pubbliche - non richiedono autenticazione
router.get('/upcoming', racesController.getUpcomingRaces);
router.get('/past', racesController.getPastRaces);
router.get('/calendar/:year', racesController.getRaceCalendar);
router.get('/:raceId', racesController.getRaceById);
router.get('/:raceId/results', racesController.getRaceResults);

export default router;