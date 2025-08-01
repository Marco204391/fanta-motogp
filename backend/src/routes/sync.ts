// backend/src/routes/sync.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as syncController from '../controllers/syncController';

const router = Router();

// Tutte le route richiedono autenticazione e ruolo admin
router.use(authenticate);
router.use(syncController.requireAdmin);

// Route sincronizzazioni
router.post('/riders', syncController.syncRiders);
router.post('/calendar', syncController.syncCalendar);
router.post('/race-results/:raceId', syncController.syncRaceResults);

// Route informative
router.get('/logs', syncController.getSyncLogs);
router.get('/status', syncController.getSyncStatus);

// Route per inserimento manuale risultati
router.get('/results/template/:raceId/:category', syncController.getResultsTemplate);
router.post('/results', syncController.insertRaceResults);

export default router;