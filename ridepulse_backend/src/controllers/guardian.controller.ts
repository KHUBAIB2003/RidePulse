import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { GuardianService } from '../services/guardian.service.js';
import {
  sendInvitationSchema,
  acceptInvitationSchema,
  rejectInvitationSchema,
  startSessionSchema,
  acknowledgeCheckInSchema,
  endSessionSchema,
  updateGuardianSchema
} from '../validators/guardian.validator.js';

/**
 * @swagger
 * tags:
 *   name: Guardian
 *   description: Guardian Safety Check-In Engine — ride monitoring, escalation & alerts
 */
export class GuardianController {

  // ────────────────────────────────────────────────────────────
  // INVITATIONS
  // ────────────────────────────────────────────────────────────

  /**
   * @swagger
   * /api/v1/guardian/invite:
   *   post:
   *     summary: Invite a RidePulse user to be your guardian
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [inviteeCallsign]
   *             properties:
   *               inviteeCallsign:
   *                 type: string
   *                 example: RIDER_HAWK
   *               label:
   *                 type: string
   *                 example: My Trusted Guardian
   *               priority:
   *                 type: integer
   *                 example: 1
   *               permissions:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: [VIEW_LOCATION, RECEIVE_CHECKIN_ALERTS, RECEIVE_SOS_ALERTS]
   *               message:
   *                 type: string
   *                 example: Hey, can you watch over me during my rides?
   *     responses:
   *       201:
   *         description: Invitation sent successfully
   *       400:
   *         description: Self-invitation or validation error
   *       404:
   *         description: Invitee not found
   *       409:
   *         description: Duplicate invitation or existing guardian
   */
  static async sendInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = sendInvitationSchema.parse(req.body);
      const invitation = await GuardianService.sendInvitation(req.user!.userId, input);
      res.status(201).json({
        success: true,
        data: invitation,
        message: `Guardian invitation sent to "${input.inviteeCallsign}" — valid for 72 hours`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/guardian/accept:
   *   post:
   *     summary: Accept a guardian invitation
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [invitationId]
   *             properties:
   *               invitationId:
   *                 type: string
   *                 example: 66d4a3b2c1e2f3a4b5c6d7e8
   *     responses:
   *       200:
   *         description: Invitation accepted — guardian relationship established
   *       400:
   *         description: Invitation expired or already responded to
   *       403:
   *         description: You are not the recipient of this invitation
   */
  static async acceptInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = acceptInvitationSchema.parse(req.body);
      const guardian = await GuardianService.acceptInvitation(req.user!.userId, input);
      res.status(200).json({
        success: true,
        data: guardian,
        message: 'Guardian invitation accepted — you are now monitoring this rider'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/guardian/reject:
   *   post:
   *     summary: Reject a guardian invitation
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [invitationId]
   *             properties:
   *               invitationId:
   *                 type: string
   *               reason:
   *                 type: string
   *                 example: Not available at this time
   *     responses:
   *       200:
   *         description: Invitation rejected
   */
  static async rejectInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = rejectInvitationSchema.parse(req.body);
      await GuardianService.rejectInvitation(req.user!.userId, input);
      res.status(200).json({
        success: true,
        data: null,
        message: 'Guardian invitation rejected'
      });
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────────────────────────────────────────
  // GUARDIAN MANAGEMENT
  // ────────────────────────────────────────────────────────────

  /**
   * @swagger
   * /api/v1/guardian:
   *   get:
   *     summary: Get all your guardians
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of guardian relationships
   */
  static async getMyGuardians(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const guardians = await GuardianService.getMyGuardians(req.user!.userId);
      res.status(200).json({ success: true, data: guardians });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/guardian/monitoring:
   *   get:
   *     summary: Get all riders you are monitoring
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of riders being monitored
   */
  static async getRidersIGuard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const riders = await GuardianService.getRidersIGuard(req.user!.userId);
      res.status(200).json({ success: true, data: riders });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/guardian/invitations/pending:
   *   get:
   *     summary: Get pending guardian invitations sent to you
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Pending invitations
   */
  static async getPendingInvitations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const invitations = await GuardianService.getPendingInvitations(req.user!.userId);
      res.status(200).json({ success: true, data: invitations });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/guardian/invitations/sent:
   *   get:
   *     summary: Get invitations you have sent as a rider
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   */
  static async getSentInvitations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const invitations = await GuardianService.getSentInvitations(req.user!.userId);
      res.status(200).json({ success: true, data: invitations });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/guardian/{id}:
   *   get:
   *     summary: Get a single guardian record
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   */
  static async getGuardianById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const guardian = await GuardianService.getGuardianById(req.user!.userId, req.params.id);
      res.status(200).json({ success: true, data: guardian });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/guardian/{id}:
   *   patch:
   *     summary: Update guardian label, priority, permissions or active status
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               label:
   *                 type: string
   *               priority:
   *                 type: integer
   *               isActive:
   *                 type: boolean
   */
  static async updateGuardian(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateGuardianSchema.parse(req.body);
      const guardian = await GuardianService.updateGuardian(req.user!.userId, req.params.id, input);
      res.status(200).json({
        success: true,
        data: guardian,
        message: 'Guardian updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/guardian/{id}:
   *   delete:
   *     summary: Remove a guardian
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Guardian removed
   */
  static async removeGuardian(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await GuardianService.removeGuardian(req.user!.userId, req.params.id);
      res.status(200).json({
        success: true,
        data: null,
        message: 'Guardian removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────────────────────────────────────────
  // MONITORING SESSIONS
  // ────────────────────────────────────────────────────────────

  /**
   * @swagger
   * /api/v1/guardian/start:
   *   post:
   *     summary: Start a guardian monitoring session
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [guardianId]
   *             properties:
   *               guardianId:
   *                 type: string
   *               rideId:
   *                 type: string
   *               intervalMinutes:
   *                 type: integer
   *                 example: 30
   *               gracePeriodMinutes:
   *                 type: integer
   *                 example: 5
   *               latitude:
   *                 type: number
   *               longitude:
   *                 type: number
   */
  static async startSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = startSessionSchema.parse(req.body);
      const session = await GuardianService.startSession(req.user!.userId, input);
      res.status(201).json({
        success: true,
        data: session,
        message: 'Guardian monitoring session started'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/guardian/checkin:
   *   post:
   *     summary: Manually acknowledge a scheduled check-in
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [sessionId]
   *             properties:
   *               sessionId:
   *                 type: string
   *               latitude:
   *                 type: number
   *               longitude:
   *                 type: number
   *               note:
   *                 type: string
   */
  static async acknowledgeCheckIn(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = acknowledgeCheckInSchema.parse(req.body);
      const session = await GuardianService.acknowledgeCheckIn(req.user!.userId, input);
      res.status(200).json({
        success: true,
        data: session,
        message: 'Check-in acknowledged — guardian notified'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/guardian/end:
   *   post:
   *     summary: End an active guardian monitoring session
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [sessionId]
   *             properties:
   *               sessionId:
   *                 type: string
   *               reason:
   *                 type: string
   */
  static async endSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = endSessionSchema.parse(req.body);
      const session = await GuardianService.endSession(req.user!.userId, input);
      res.status(200).json({
        success: true,
        data: session,
        message: 'Guardian monitoring session ended safely'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/guardian/session/active:
   *   get:
   *     summary: Get your current active guardian session
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   */
  static async getActiveSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await GuardianService.getActiveSession(req.user!.userId);
      res.status(200).json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/guardian/session/{id}:
   *   get:
   *     summary: Get a guardian session by ID
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   */
  static async getSessionById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await GuardianService.getSessionById(req.user!.userId, req.params.id);
      res.status(200).json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/guardian/history:
   *   get:
   *     summary: Get guardian session history
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   */
  static async getSessionHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await GuardianService.getSessionHistory(req.user!.userId);
      res.status(200).json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/guardian/activity:
   *   get:
   *     summary: Get guardian activity log
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   */
  static async getActivityHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const activities = await GuardianService.getActivityHistory(req.user!.userId, limit);
      res.status(200).json({ success: true, data: activities });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/guardian/analytics:
   *   get:
   *     summary: Get guardian analytics summary
   *     tags: [Guardian]
   *     security:
   *       - bearerAuth: []
   */
  static async getAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const analytics = await GuardianService.getAnalytics(req.user!.userId);
      res.status(200).json({ success: true, data: analytics });
    } catch (error) {
      next(error);
    }
  }
}
