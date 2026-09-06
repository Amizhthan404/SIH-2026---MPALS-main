import { Router } from 'express';
import { AssetsController } from '../controllers/assets.controller.js';

const router = Router();

router.get('/', AssetsController.getAll);

export default router;
