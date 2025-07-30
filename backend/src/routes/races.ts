// backend/src/routes/races.ts
import { Router } from 'express';
import * as racesController from '../controllers/racesController';

const router = Router();

router.get('/upcoming', racesController.getUpcomingRaces);
router.get('/past', racesController.getPastRaces);

export default router;