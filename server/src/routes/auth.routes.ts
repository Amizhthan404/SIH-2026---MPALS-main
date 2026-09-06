import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', AuthController.login);
router.get('/me', authenticateToken, AuthController.getMe);
router.get('/users', authenticateToken, AuthController.getUsers);

export default router;
