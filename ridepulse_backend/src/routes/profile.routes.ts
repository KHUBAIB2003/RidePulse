import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateJwt);

router.get('/', ProfileController.getProfile);
router.put('/', ProfileController.updateProfile);
router.put('/preferences', ProfileController.updatePreferences);
router.delete('/', ProfileController.deleteAccount);

// Avatar Endpoints (Multer / memory storage handles upload bytes in controller)
router.delete('/avatar', ProfileController.deleteAvatar);

// Session & Device Management
router.get('/sessions', ProfileController.getSessions);
router.delete('/sessions/:id', ProfileController.deleteSession);
router.delete('/sessions', ProfileController.deleteAllSessions);

// Activity Audit Log History
router.get('/activity', ProfileController.getActivityLogs);

// Emergency Contacts CRUD
router.post('/emergency-contacts', ProfileController.addEmergencyContact);
router.put('/emergency-contacts/:id', ProfileController.updateEmergencyContact);
router.delete('/emergency-contacts/:id', ProfileController.deleteEmergencyContact);

export default router;
