import { Router } from 'express';
import { GuardianController } from '../controllers/guardian.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// All guardian routes require authentication
router.use(authenticateJwt as any);

// ── Invitation Endpoints ─────────────────────────────────────
router.post('/invite',  GuardianController.sendInvitation as any);
router.post('/accept',  GuardianController.acceptInvitation as any);
router.post('/reject',  GuardianController.rejectInvitation as any);

// ── Invitation Queries ───────────────────────────────────────
router.get('/invitations/pending', GuardianController.getPendingInvitations as any);
router.get('/invitations/sent',    GuardianController.getSentInvitations as any);

// ── Session Endpoints ────────────────────────────────────────
router.post('/start',   GuardianController.startSession as any);
router.post('/checkin', GuardianController.acknowledgeCheckIn as any);
router.post('/end',     GuardianController.endSession as any);

// ── Session Queries ──────────────────────────────────────────
router.get('/session/active',  GuardianController.getActiveSession as any);
router.get('/session/:id',     GuardianController.getSessionById as any);

// ── Guardian Queries ─────────────────────────────────────────
router.get('/',          GuardianController.getMyGuardians as any);
router.get('/monitoring', GuardianController.getRidersIGuard as any);
router.get('/history',   GuardianController.getSessionHistory as any);
router.get('/activity',  GuardianController.getActivityHistory as any);
router.get('/analytics', GuardianController.getAnalytics as any);
router.get('/:id',       GuardianController.getGuardianById as any);

// ── Guardian Management ──────────────────────────────────────
router.patch('/:id',  GuardianController.updateGuardian as any);
router.delete('/:id', GuardianController.removeGuardian as any);

export const guardianRoutes = router;
