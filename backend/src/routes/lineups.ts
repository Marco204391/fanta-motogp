// backend/src/routes/lineups.ts
import { Router } from 'express';
import * as lineupsController from '../controllers/lineupsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/:raceId', lineupsController.getLineup);
router.post('/:raceId', lineupsController.setLineup);

export default router;