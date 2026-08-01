import { Router } from 'express';
import { RideController } from '../controllers/ride.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateJwt as any);

router.post('/start', RideController.startRide as any);
router.post('/pause', RideController.pauseRide as any);
router.post('/resume', RideController.resumeRide as any);
router.post('/stop', RideController.stopRide as any);
router.post('/location', RideController.addLocation as any);
router.post('/telemetry', RideController.addBatchTelemetry as any);

router.get('/', RideController.getRides as any);
router.get('/statistics/summary', RideController.getRideStatistics as any);
router.get('/:id', RideController.getRideById as any);
router.get('/:id/replay', RideController.getRideReplay as any);
router.get('/:id/statistics', RideController.getRideById as any);
router.get('/:id/export/gpx', RideController.exportGPX as any);
router.get('/:id/export/geojson', RideController.exportGeoJSON as any);
router.get('/:id/export/csv', RideController.exportCSV as any);
router.delete('/:id', RideController.deleteRide as any);

export const rideRoutes = router;
