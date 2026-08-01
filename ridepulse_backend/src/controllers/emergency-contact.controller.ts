import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { EmergencyContactService } from '../services/emergency-contact.service.js';
import {
  createContactSchema,
  updateContactSchema,
  sendInviteSchema,
  acceptInviteSchema,
  rejectInviteSchema,
  listContactsQuerySchema
} from '../validators/emergency-contact.validator.js';

/**
 * @swagger
 * tags:
 *   name: EmergencyContacts
 *   description: Emergency Contact Intelligence Engine — priority contacts, multi-channel dispatch, invitations
 */
export class EmergencyContactController {

  // ────────────────────────────────────────────────────────────
  // CRUD
  // ────────────────────────────────────────────────────────────

  /**
   * @swagger
   * /api/v1/emergency-contacts:
   *   get:
   *     summary: Get all emergency contacts (priority-ordered)
   *     tags: [EmergencyContacts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: string
   *           enum: [true, false]
   *       - in: query
   *         name: isPrimary
   *         schema:
   *           type: string
   *           enum: [true, false]
   *       - in: query
   *         name: isFavourite
   *         schema:
   *           type: string
   *           enum: [true, false]
   *       - in: query
   *         name: relationship
   *         schema:
   *           type: string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: string
   *           default: '50'
   *       - in: query
   *         name: skip
   *         schema:
   *           type: string
   *           default: '0'
   *     responses:
   *       200:
   *         description: Priority-sorted contact list
   */
  static async listContacts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listContactsQuerySchema.parse(req.query);
      const contacts = await EmergencyContactService.listContacts(req.user!.userId, query);
      res.status(200).json({ success: true, data: contacts, count: contacts.length });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/emergency-contacts:
   *   post:
   *     summary: Create a new emergency contact
   *     tags: [EmergencyContacts]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, phone]
   *             properties:
   *               name:
   *                 type: string
   *                 example: Priya Sharma
   *               relationship:
   *                 type: string
   *                 example: SPOUSE
   *               phone:
   *                 type: string
   *                 example: "9876543210"
   *               countryCode:
   *                 type: string
   *                 example: "+91"
   *               email:
   *                 type: string
   *                 example: priya@example.com
   *               priority:
   *                 type: integer
   *                 example: 1
   *               isPrimary:
   *                 type: boolean
   *               isFavourite:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Contact created
   *       409:
   *         description: Duplicate phone number
   */
  static async createContact(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createContactSchema.parse(req.body);
      const ip    = req.ip;
      const contact = await EmergencyContactService.createContact(req.user!.userId, input, ip);
      res.status(201).json({
        success: true,
        data:    contact,
        message: 'Emergency contact created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/emergency-contacts/{id}:
   *   get:
   *     summary: Get a single emergency contact by ID
   *     tags: [EmergencyContacts]
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
   *         description: Contact details
   *       404:
   *         description: Not found
   */
  static async getContact(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const contact = await EmergencyContactService.getContactById(req.user!.userId, req.params.id);
      res.status(200).json({ success: true, data: contact });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/emergency-contacts/{id}:
   *   put:
   *     summary: Update an emergency contact
   *     tags: [EmergencyContacts]
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
   *               name:
   *                 type: string
   *               phone:
   *                 type: string
   *               priority:
   *                 type: integer
   *               isFavourite:
   *                 type: boolean
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Contact updated
   */
  static async updateContact(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input   = updateContactSchema.parse(req.body);
      const ip      = req.ip;
      const contact = await EmergencyContactService.updateContact(req.user!.userId, req.params.id, input, ip);
      res.status(200).json({
        success: true,
        data:    contact,
        message: 'Emergency contact updated'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/emergency-contacts/{id}:
   *   delete:
   *     summary: Soft-delete an emergency contact
   *     tags: [EmergencyContacts]
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
   *         description: Contact deleted
   */
  static async deleteContact(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await EmergencyContactService.deleteContact(req.user!.userId, req.params.id, req.ip);
      res.status(200).json({
        success: true,
        data:    null,
        message: 'Emergency contact deleted'
      });
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────────────────────────────────────────
  // PRIMARY CONTACT
  // ────────────────────────────────────────────────────────────

  /**
   * @swagger
   * /api/v1/emergency-contacts/{id}/primary:
   *   patch:
   *     summary: Set a contact as the primary emergency contact
   *     tags: [EmergencyContacts]
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
   *         description: Primary contact updated
   */
  static async setPrimary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const contact = await EmergencyContactService.setPrimaryContact(req.user!.userId, req.params.id, req.ip);
      res.status(200).json({
        success: true,
        data:    contact,
        message: `"${contact.name}" is now your primary emergency contact`
      });
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────────────────────────────────────────
  // INVITATIONS
  // ────────────────────────────────────────────────────────────

  /**
   * @swagger
   * /api/v1/emergency-contacts/invite:
   *   post:
   *     summary: Send an invitation to an emergency contact
   *     tags: [EmergencyContacts]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [emergencyContactId]
   *             properties:
   *               emergencyContactId:
   *                 type: string
   *               message:
   *                 type: string
   *     responses:
   *       201:
   *         description: Invitation sent
   *       409:
   *         description: Pending invitation already exists
   */
  static async sendInvite(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input      = sendInviteSchema.parse(req.body);
      const invitation = await EmergencyContactService.sendInvite(req.user!.userId, input, req.ip);
      res.status(201).json({
        success: true,
        data:    invitation,
        message: 'Emergency contact invitation sent — valid for 48 hours'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/emergency-contacts/accept:
   *   post:
   *     summary: Accept an emergency contact invitation (contact must have a RidePulse account)
   *     tags: [EmergencyContacts]
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
   *     responses:
   *       200:
   *         description: Invitation accepted — contact verified
   */
  static async acceptInvite(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = acceptInviteSchema.parse(req.body);
      await EmergencyContactService.acceptInvite(req.user!.userId, input, req.ip);
      res.status(200).json({
        success: true,
        data:    null,
        message: 'Emergency contact invitation accepted — you are now a verified emergency contact'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/emergency-contacts/reject:
   *   post:
   *     summary: Reject an emergency contact invitation
   *     tags: [EmergencyContacts]
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
   *     responses:
   *       200:
   *         description: Invitation rejected
   */
  static async rejectInvite(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = rejectInviteSchema.parse(req.body);
      await EmergencyContactService.rejectInvite(req.user!.userId, input, req.ip);
      res.status(200).json({
        success: true,
        data:    null,
        message: 'Emergency contact invitation rejected'
      });
    } catch (error) {
      next(error);
    }
  }

  // ────────────────────────────────────────────────────────────
  // ANALYTICS & HISTORY
  // ────────────────────────────────────────────────────────────

  /**
   * @swagger
   * /api/v1/emergency-contacts/activity:
   *   get:
   *     summary: Get emergency contact activity history
   *     tags: [EmergencyContacts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *     responses:
   *       200:
   *         description: Activity log entries
   */
  static async getActivity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit      = Math.min(Number(req.query.limit) || 50, 100);
      const activities = await EmergencyContactService.getActivityHistory(req.user!.userId, limit);
      res.status(200).json({ success: true, data: activities });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/emergency-contacts/analytics:
   *   get:
   *     summary: Get emergency contact analytics summary
   *     tags: [EmergencyContacts]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Analytics data
   */
  static async getAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const analytics = await EmergencyContactService.getAnalytics(req.user!.userId);
      res.status(200).json({ success: true, data: analytics });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/emergency-contacts/{id}/notifications:
   *   get:
   *     summary: Get notification dispatch history for a contact
   *     tags: [EmergencyContacts]
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
   *         description: Notification history
   */
  static async getContactNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifications = await EmergencyContactService.getContactNotifications(req.user!.userId, req.params.id);
      res.status(200).json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/emergency-contacts/invitations/pending:
   *   get:
   *     summary: Get pending emergency contact invitations sent to me
   *     tags: [EmergencyContacts]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Pending invitations
   */
  static async getPendingInvitations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const invitations = await EmergencyContactService.getPendingInvitations(req.user!.userId);
      res.status(200).json({ success: true, data: invitations });
    } catch (error) {
      next(error);
    }
  }
}
