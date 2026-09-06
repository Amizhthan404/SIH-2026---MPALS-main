import { Router } from 'express';
import { MPsController } from '../controllers/mps.controller.js';
import { optionalAuthenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', optionalAuthenticate, MPsController.getAll);
router.get('/:id/risk', optionalAuthenticate, MPsController.getRiskExplanation);
router.get('/:id', optionalAuthenticate, MPsController.getById);

export default router;
