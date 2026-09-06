import { Router } from 'express';
import { SummaryController } from '../controllers/summary.controller.js';
import { optionalAuthenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/summary', optionalAuthenticate, SummaryController.getSummary);
router.get('/data', optionalAuthenticate, SummaryController.getFullDataset);

export default router;
