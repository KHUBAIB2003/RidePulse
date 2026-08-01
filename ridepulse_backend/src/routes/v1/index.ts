import { Router } from 'express';
import authRoutes from '../auth.routes.js';
import profileRoutes from '../profile.routes.js';
import garageRoutes from '../garage.routes.js';
import { rideRoutes } from '../ride.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/bikes', garageRoutes);
router.use('/rides', rideRoutes);

export default router;
