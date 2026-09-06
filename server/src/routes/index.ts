import { Router } from 'express';
import mpsRouter from './mps.routes.js';
import worksRouter from './works.routes.js';
import alertsRouter from './alerts.routes.js';
import statesRouter from './states.routes.js';
import districtsRouter from './districts.routes.js';
import paymentsRouter from './payments.routes.js';
import assetsRouter from './assets.routes.js';
import summaryRouter from './summary.routes.js';
import authRouter from './auth.routes.js';

const router = Router();

router.use('/mps', mpsRouter);
router.use('/works', worksRouter);
router.use('/alerts', alertsRouter);
router.use('/states', statesRouter);
router.use('/districts', districtsRouter);
router.use('/payments', paymentsRouter);
router.use('/assets', assetsRouter);
router.use('/auth', authRouter);
router.use('/', summaryRouter);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'MPLADS AI Monitoring System API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;
