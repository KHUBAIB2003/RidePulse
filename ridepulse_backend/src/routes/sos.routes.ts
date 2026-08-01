import { Router } from 'express';
import { SOSController } from '../controllers/sos.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateJwt as any);

router.post('/start', SOSController.startSOS as any);
router.post('/cancel', SOSController.cancelSOS as any);
router.post('/trigger', SOSController.triggerSOS as any);
router.post('/location', SOSController.addLocation as any);
router.post('/resolve', SOSController.resolveSOS as any);

router.get('/current', SOSController.getCurrentActiveSOS as any);
router.get('/history', SOSController.getSOSHistory as any);
router.get('/:id', SOSController.getSOSById as any);
router.get('/:id/timeline', SOSController.getSOSTimeline as any);
router.delete('/:id', SOSController.deleteSOS as any);

export const sosRoutes = router;
