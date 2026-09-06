import { Router } from 'express';
import { AlertsController } from '../controllers/alerts.controller.js';
import { authenticateToken, optionalAuthenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', optionalAuthenticate, AlertsController.getAll);
router.get('/summary', optionalAuthenticate, AlertsController.getSummary);
router.patch('/:id', authenticateToken, AlertsController.updateStatus);

export default router;
