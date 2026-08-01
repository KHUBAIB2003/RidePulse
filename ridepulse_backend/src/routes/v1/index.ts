import { Router } from 'express';
import authRoutes from '../auth.routes.js';
import profileRoutes from '../profile.routes.js';
import garageRoutes from '../garage.routes.js';
import { rideRoutes } from '../ride.routes.js';
import { sosRoutes } from '../sos.routes.js';
import { adminSosRoutes } from '../admin.sos.routes.js';
import { guardianRoutes } from '../guardian.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/bikes', garageRoutes);
router.use('/rides', rideRoutes);
router.use('/sos', sosRoutes);
router.use('/admin/sos', adminSosRoutes);
router.use('/guardian', guardianRoutes);

export default router;
