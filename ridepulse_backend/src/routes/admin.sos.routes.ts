import { Router } from 'express';
import { SOSController } from '../controllers/sos.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateJwt as any);

router.get('/', SOSController.getAllIncidentsAdmin as any);
router.get('/:id', SOSController.getSOSById as any);
router.patch('/:id/close', SOSController.adminForceClose as any);
router.patch('/:id/escalate', SOSController.adminEscalate as any);

export const adminSosRoutes = router;
