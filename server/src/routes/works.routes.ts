import { Router } from 'express';
import { WorksController } from '../controllers/works.controller.js';
import { optionalAuthenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', optionalAuthenticate, WorksController.getAll);
router.get('/summary', optionalAuthenticate, WorksController.getSummary);
router.get('/:id', optionalAuthenticate, WorksController.getById);

export default router;
