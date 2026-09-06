import { Router } from 'express';
import { PaymentsController } from '../controllers/payments.controller.js';

const router = Router();

router.get('/', PaymentsController.getAll);

export default router;
