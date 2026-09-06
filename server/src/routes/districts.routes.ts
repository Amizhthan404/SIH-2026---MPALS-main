import { Router } from 'express';
import { DistrictsController } from '../controllers/districts.controller.js';

const router = Router();

router.get('/', DistrictsController.getAll);
router.get('/:id', DistrictsController.getById);

export default router;
