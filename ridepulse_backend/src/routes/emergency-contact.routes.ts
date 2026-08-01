import { Router } from 'express';
import { EmergencyContactController } from '../controllers/emergency-contact.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// All emergency-contact routes require authentication
router.use(authenticateJwt as any);

// ── Analytics & History (before :id routes) ──────────────────
router.get('/activity',             EmergencyContactController.getActivity as any);
router.get('/analytics',            EmergencyContactController.getAnalytics as any);
router.get('/invitations/pending',  EmergencyContactController.getPendingInvitations as any);

// ── Invitation Endpoints ──────────────────────────────────────
router.post('/invite', EmergencyContactController.sendInvite as any);
router.post('/accept', EmergencyContactController.acceptInvite as any);
router.post('/reject', EmergencyContactController.rejectInvite as any);

// ── Collection Endpoints ──────────────────────────────────────
router.get('/',  EmergencyContactController.listContacts as any);
router.post('/', EmergencyContactController.createContact as any);

// ── Resource Endpoints ────────────────────────────────────────
router.get('/:id',              EmergencyContactController.getContact as any);
router.put('/:id',              EmergencyContactController.updateContact as any);
router.delete('/:id',           EmergencyContactController.deleteContact as any);
router.patch('/:id/primary',    EmergencyContactController.setPrimary as any);
router.get('/:id/notifications', EmergencyContactController.getContactNotifications as any);

export const emergencyContactRoutes = router;
