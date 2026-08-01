import { randomBytes } from 'crypto';
import {
  EmergencyContact,
  IEmergencyContact,
  NotificationChannel
} from '../models/EmergencyContact.model.js';
import { EmergencyContactInvitation } from '../models/EmergencyContactInvitation.model.js';
import { EmergencyContactActivity, ECActivityType } from '../models/EmergencyContactActivity.model.js';
import { EmergencyNotification, EmergencyNotificationTrigger } from '../models/EmergencyNotification.model.js';
import { User } from '../models/User.model.js';
import { SocketManager } from '../sockets/socket.manager.js';
import { notificationEngine } from '../abstractions/notification.abstraction.js';
import {
  CreateContactInput,
  UpdateContactInput,
  SendInviteInput,
  AcceptInviteInput,
  RejectInviteInput,
  ListContactsQuery
} from '../validators/emergency-contact.validator.js';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError
} from '../errors/httpExceptions.js';
import { logger } from '../utils/logger.util.js';

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────
const MAX_CONTACTS      = 10;
const INVITATION_TTL_H  = 48;

// ──────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

async function logActivity(params: {
  ownerId:            string;
  emergencyContactId: string;
  activityType:       ECActivityType;
  description:        string;
  performedBy:        'USER' | 'SYSTEM' | 'CONTACT';
  performedByUserId?: string;
  metadata?:          Record<string, unknown>;
  ipAddress?:         string;
}): Promise<void> {
  try {
    await EmergencyContactActivity.create(params);
  } catch (err) {
    logger.error({ err }, '[ECService] Failed to write activity log');
  }
}

// ──────────────────────────────────────────────────────────────
// Priority Engine
// ──────────────────────────────────────────────────────────────
/**
 * Returns contacts ordered by:
 *  1. isPrimary first
 *  2. priority ASC (lower = first)
 *  3. isFavourite (tie-break)
 *  4. verificationStatus VERIFIED before UNVERIFIED
 */
function sortByPriority(contacts: IEmergencyContact[]): IEmergencyContact[] {
  return [...contacts].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    if (a.priority  !== b.priority)  return a.priority - b.priority;
    if (a.isFavourite !== b.isFavourite) return a.isFavourite ? -1 : 1;
    const vScore = (c: IEmergencyContact) => c.verificationStatus === 'VERIFIED' ? 0 : 1;
    return vScore(a) - vScore(b);
  });
}

// ──────────────────────────────────────────────────────────────
// Notification Dispatch Engine
// ──────────────────────────────────────────────────────────────
/**
 * Dispatches an emergency alert to ONE contact via their preferred channels in order.
 * Falls back to next enabled channel on failure.
 * Logs every attempt and updates counters.
 */
async function dispatchToContact(
  contact: IEmergencyContact,
  notification: InstanceType<typeof EmergencyNotification>,
  title:   string,
  body:    string
): Promise<void> {
  const orderedChannels = contact.channelPreferences
    .filter(c => c.enabled)
    .sort((a, b) => {
      // SMS and CALL first for emergency
      const priority: Record<NotificationChannel, number> = {
        CALL: 0, SMS: 1, WHATSAPP: 2, PUSH: 3, EMAIL: 4
      };
      return (priority[a.channel] ?? 99) - (priority[b.channel] ?? 99);
    });

  for (const pref of orderedChannels) {
    const address = pref.address || contact.phone;
    let result: { success: boolean; messageId: string } = { success: false, messageId: '' };

    try {
      switch (pref.channel) {
        case 'SMS':
          result = await notificationEngine.sendSms(address, body);
          break;
        case 'WHATSAPP':
          result = await notificationEngine.sendWhatsApp(address, body);
          break;
        case 'EMAIL':
          result = await notificationEngine.sendEmail(address, title, body);
          break;
        case 'PUSH':
          result = await notificationEngine.sendPushNotification(address, title, body);
          break;
        case 'CALL':
          // CALL is architecture-ready; mock as SMS for now
          result = await notificationEngine.sendSms(address, `[CALL ALERT] ${body}`);
          break;
      }
    } catch (err) {
      result = { success: false, messageId: '' };
      logger.warn({ err, channel: pref.channel }, '[EC Dispatch] Channel error');
    }

    notification.channelAttempts.push({
      channel:     pref.channel,
      address,
      status:      result.success ? 'SENT' : 'FAILED',
      attemptedAt: new Date(),
      messageId:   result.messageId || undefined
    });
    notification.totalAttempts += 1;

    if (result.success) {
      notification.successfulChannels.push(pref.channel);
      notification.status = 'SENT';

      // Update contact counters
      await EmergencyContact.findByIdAndUpdate(contact._id, {
        $inc: { totalAlertsSent: 1 },
        lastContactedAt: new Date()
      });

      // Log notification entry on the contact
      const logEntry = {
        event:     notification.trigger,
        channel:   pref.channel,
        status:    'SENT' as const,
        sentAt:    new Date(),
        attempt:   1,
        messageId: result.messageId || undefined
      };
      await EmergencyContact.findByIdAndUpdate(contact._id, {
        $push: { notificationLog: { $each: [logEntry], $slice: -50 } }
      });

      // First success is enough for emergency; stop further channels
      break;
    }
  }

  if (notification.successfulChannels.length === 0) {
    notification.status = 'FAILED';
    await EmergencyContact.findByIdAndUpdate(contact._id, {
      $inc: { totalAlertsFailed: 1 }
    });
  }

  notification.dispatchedAt = new Date();
  await notification.save();
}

// ══════════════════════════════════════════════════════════════
// EmergencyContactService
// ══════════════════════════════════════════════════════════════
export class EmergencyContactService {

  // ────────────────────────────────────────────────────────────
  // CRUD
  // ────────────────────────────────────────────────────────────

  /** Create a new emergency contact */
  static async createContact(ownerId: string, input: CreateContactInput, ipAddress?: string): Promise<IEmergencyContact> {
    // Hard limit
    const count = await EmergencyContact.countDocuments({ ownerId, isSoftDeleted: false });
    if (count >= MAX_CONTACTS) {
      throw new BadRequestError(`Maximum of ${MAX_CONTACTS} emergency contacts allowed`);
    }

    // Duplicate phone guard
    const duplicate = await EmergencyContact.findOne({
      ownerId,
      phone: input.phone,
      isSoftDeleted: false
    });
    if (duplicate) throw new ConflictError('A contact with this phone number already exists');

    // If setting as primary, clear existing primary first
    if (input.isPrimary) {
      await EmergencyContact.updateMany({ ownerId, isPrimary: true }, { $set: { isPrimary: false } });
    }

    // If first contact, auto-set as primary
    const isPrimary = input.isPrimary || count === 0;

    const contact = await EmergencyContact.create({
      ...input,
      ownerId,
      isPrimary
    });

    // Real-time notification
    SocketManager.getInstance().emitToUser(ownerId, 'contact.created', {
      contactId:    contact._id,
      name:         contact.name,
      relationship: contact.relationship,
      isPrimary:    contact.isPrimary
    });

    await logActivity({
      ownerId,
      emergencyContactId: contact._id.toString(),
      activityType:       'CONTACT_CREATED',
      description:        `Emergency contact "${contact.name}" created`,
      performedBy:        'USER',
      performedByUserId:  ownerId,
      metadata:           { relationship: contact.relationship, priority: contact.priority },
      ipAddress
    });

    logger.info(`[EC] Contact created: owner=${ownerId} contact=${contact._id}`);
    return contact;
  }

  /** Get all contacts for a user, with optional filters and smart priority ordering */
  static async listContacts(ownerId: string, query: ListContactsQuery): Promise<IEmergencyContact[]> {
    const filter: Record<string, unknown> = {
      ownerId,
      isSoftDeleted: false
    };

    if (query.isActive !== undefined)    filter.isActive    = query.isActive === 'true';
    if (query.isPrimary !== undefined)   filter.isPrimary   = query.isPrimary === 'true';
    if (query.isFavourite !== undefined) filter.isFavourite = query.isFavourite === 'true';
    if (query.relationship)              filter.relationship = query.relationship;

    const limit = Math.min(parseInt(query.limit ?? '50'), 100);
    const skip  = parseInt(query.skip ?? '0');

    const contacts = await EmergencyContact.find(filter)
      .limit(limit)
      .skip(skip)
      .lean() as unknown as IEmergencyContact[];

    return sortByPriority(contacts);
  }

  /** Get a single contact by ID */
  static async getContactById(ownerId: string, contactId: string): Promise<IEmergencyContact> {
    const contact = await EmergencyContact.findOne({
      _id:          contactId,
      ownerId,
      isSoftDeleted: false
    });
    if (!contact) throw new NotFoundError('Emergency contact not found');
    return contact;
  }

  /** Update a contact */
  static async updateContact(ownerId: string, contactId: string, input: UpdateContactInput, ipAddress?: string): Promise<IEmergencyContact> {
    const contact = await EmergencyContact.findOne({ _id: contactId, ownerId, isSoftDeleted: false });
    if (!contact) throw new NotFoundError('Emergency contact not found');

    // Phone duplicate check if changing phone
    if (input.phone && input.phone !== contact.phone) {
      const dup = await EmergencyContact.findOne({
        ownerId,
        phone:         input.phone,
        isSoftDeleted: false,
        _id:           { $ne: contactId }
      });
      if (dup) throw new ConflictError('Another contact already uses this phone number');
    }

    const changedFields: Record<string, unknown> = {};

    (Object.keys(input) as (keyof UpdateContactInput)[]).forEach(key => {
      if (input[key] !== undefined) {
        (contact as any)[key] = input[key];
        changedFields[key] = input[key];
      }
    });

    await contact.save();

    SocketManager.getInstance().emitToUser(ownerId, 'contact.updated', {
      contactId: contact._id,
      changes:   Object.keys(changedFields)
    });

    await logActivity({
      ownerId,
      emergencyContactId: contactId,
      activityType:       'CONTACT_UPDATED',
      description:        `Emergency contact "${contact.name}" updated`,
      performedBy:        'USER',
      performedByUserId:  ownerId,
      metadata:           changedFields,
      ipAddress
    });

    return contact;
  }

  /** Soft-delete a contact */
  static async deleteContact(ownerId: string, contactId: string, ipAddress?: string): Promise<void> {
    const contact = await EmergencyContact.findOne({ _id: contactId, ownerId, isSoftDeleted: false });
    if (!contact) throw new NotFoundError('Emergency contact not found');

    // If deleting primary, warn; system will auto-assign next highest priority
    const wasPrimary = contact.isPrimary;

    contact.isSoftDeleted = true;
    contact.deletedAt     = new Date();
    contact.isActive      = false;
    contact.isPrimary     = false;
    await contact.save();

    // Auto-reassign primary to next contact by priority
    if (wasPrimary) {
      const nextContact = await EmergencyContact.findOne({
        ownerId,
        isSoftDeleted: false,
        isActive:      true
      }).sort({ priority: 1 });

      if (nextContact) {
        nextContact.isPrimary = true;
        await nextContact.save();
        await logActivity({
          ownerId,
          emergencyContactId: nextContact._id.toString(),
          activityType:       'PRIMARY_SET',
          description:        `"${nextContact.name}" auto-promoted to primary contact`,
          performedBy:        'SYSTEM',
          metadata:           { reason: 'previous_primary_deleted' }
        });
      }
    }

    SocketManager.getInstance().emitToUser(ownerId, 'contact.deleted', {
      contactId,
      wasPrimary
    });

    await logActivity({
      ownerId,
      emergencyContactId: contactId,
      activityType:       'CONTACT_DELETED',
      description:        `Emergency contact "${contact.name}" deleted`,
      performedBy:        'USER',
      performedByUserId:  ownerId,
      metadata:           { wasPrimary },
      ipAddress
    });

    logger.info(`[EC] Contact deleted: owner=${ownerId} contact=${contactId}`);
  }

  // ────────────────────────────────────────────────────────────
  // PRIMARY CONTACT ENGINE
  // ────────────────────────────────────────────────────────────

  /** Set exactly one primary contact — atomically clears others */
  static async setPrimaryContact(ownerId: string, contactId: string, ipAddress?: string): Promise<IEmergencyContact> {
    const contact = await EmergencyContact.findOne({ _id: contactId, ownerId, isSoftDeleted: false });
    if (!contact) throw new NotFoundError('Emergency contact not found');
    if (!contact.isActive) throw new BadRequestError('Cannot set an inactive contact as primary');

    // Atomic: clear all primaries for this user, then set the new one
    await EmergencyContact.updateMany({ ownerId, isPrimary: true }, { $set: { isPrimary: false } });

    contact.isPrimary = true;
    await contact.save();

    SocketManager.getInstance().emitToUser(ownerId, 'contact.updated', {
      contactId:  contact._id,
      changes:    ['isPrimary'],
      isPrimary:  true
    });

    await logActivity({
      ownerId,
      emergencyContactId: contactId,
      activityType:       'PRIMARY_SET',
      description:        `"${contact.name}" set as primary emergency contact`,
      performedBy:        'USER',
      performedByUserId:  ownerId,
      ipAddress
    });

    return contact;
  }

  // ────────────────────────────────────────────────────────────
  // INVITATIONS
  // ────────────────────────────────────────────────────────────

  /** Send an invitation to a contact (even non-RidePulse users) */
  static async sendInvite(ownerId: string, input: SendInviteInput, ipAddress?: string): Promise<InstanceType<typeof EmergencyContactInvitation>> {
    const owner   = await User.findById(ownerId).lean();
    if (!owner) throw new NotFoundError('User not found');

    const contact = await EmergencyContact.findOne({
      _id:          input.emergencyContactId,
      ownerId,
      isSoftDeleted: false
    });
    if (!contact) throw new NotFoundError('Emergency contact not found');

    // Check for existing pending invitation
    const existing = await EmergencyContactInvitation.findOne({
      emergencyContactId: input.emergencyContactId,
      ownerId,
      status:             'PENDING'
    });
    if (existing) throw new ConflictError('A pending invitation already exists for this contact');

    // Try to resolve RidePulse account by phone
    const inviteeUser = await User.findOne({
      phoneNumber:   contact.phone,
      isSoftDeleted: false,
      accountStatus: 'ACTIVE'
    }).lean();

    const expiresAt = new Date(Date.now() + INVITATION_TTL_H * 3_600_000);

    const invitation = await EmergencyContactInvitation.create({
      ownerId,
      ownerDisplayName:  owner.displayName,
      ownerCallsign:     owner.callsign,
      contactName:       contact.name,
      contactPhone:      contact.phone,
      contactEmail:      contact.email,
      inviteeUserId:     inviteeUser?._id,
      emergencyContactId: input.emergencyContactId,
      relationship:      contact.relationship,
      requestedChannels: contact.channelPreferences.filter(c => c.enabled).map(c => c.channel),
      message:           input.message,
      token:             generateToken(),
      tokenExpiresAt:    expiresAt
    });

    // If the contact has a RidePulse account, push real-time notification
    if (inviteeUser) {
      SocketManager.getInstance().emitToUser(inviteeUser._id.toString(), 'contact.invited', {
        invitationId:     invitation._id,
        ownerDisplayName: owner.displayName,
        ownerCallsign:    owner.callsign,
        message:          input.message,
        expiresAt
      });
    }

    await logActivity({
      ownerId,
      emergencyContactId: input.emergencyContactId,
      activityType:       'INVITATION_SENT',
      description:        `Invitation sent to contact "${contact.name}"`,
      performedBy:        'USER',
      performedByUserId:  ownerId,
      metadata:           { invitationId: invitation._id.toString() },
      ipAddress
    });

    logger.info(`[EC] Invitation sent: owner=${ownerId} contact=${input.emergencyContactId}`);
    return invitation;
  }

  /** Accept an invitation (called by the contact if they have a RidePulse account) */
  static async acceptInvite(userId: string, input: AcceptInviteInput, ipAddress?: string): Promise<void> {
    const invitation = await EmergencyContactInvitation.findById(input.invitationId);
    if (!invitation) throw new NotFoundError('Invitation not found');

    if (invitation.inviteeUserId?.toString() !== userId) {
      throw new ForbiddenError('You are not the recipient of this invitation');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestError(`Invitation is already ${invitation.status}`);
    }

    if (invitation.tokenExpiresAt < new Date()) {
      invitation.status = 'EXPIRED';
      await invitation.save();
      throw new BadRequestError('This invitation has expired');
    }

    invitation.status      = 'ACCEPTED';
    invitation.respondedAt = new Date();
    await invitation.save();

    // Mark contact as verified
    await EmergencyContact.findByIdAndUpdate(invitation.emergencyContactId, {
      verificationStatus: 'VERIFIED',
      verifiedAt:         new Date()
    });

    SocketManager.getInstance().emitToUser(invitation.ownerId.toString(), 'contact.verified', {
      emergencyContactId: invitation.emergencyContactId,
      contactName:        invitation.contactName
    });

    await logActivity({
      ownerId:            invitation.ownerId.toString(),
      emergencyContactId: invitation.emergencyContactId.toString(),
      activityType:       'INVITATION_ACCEPTED',
      description:        `"${invitation.contactName}" accepted the emergency contact invitation`,
      performedBy:        'CONTACT',
      performedByUserId:  userId,
      ipAddress
    });

    await logActivity({
      ownerId:            invitation.ownerId.toString(),
      emergencyContactId: invitation.emergencyContactId.toString(),
      activityType:       'VERIFICATION_COMPLETED',
      description:        `Contact "${invitation.contactName}" verified via invitation acceptance`,
      performedBy:        'SYSTEM',
      ipAddress
    });

    logger.info(`[EC] Invitation accepted: invitee=${userId} contact=${invitation.emergencyContactId}`);
  }

  /** Reject an invitation */
  static async rejectInvite(userId: string, input: RejectInviteInput, ipAddress?: string): Promise<void> {
    const invitation = await EmergencyContactInvitation.findById(input.invitationId);
    if (!invitation) throw new NotFoundError('Invitation not found');

    if (invitation.inviteeUserId?.toString() !== userId) {
      throw new ForbiddenError('You are not the recipient of this invitation');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestError(`Invitation is already ${invitation.status}`);
    }

    invitation.status          = 'REJECTED';
    invitation.respondedAt     = new Date();
    invitation.rejectionReason = input.reason;
    await invitation.save();

    SocketManager.getInstance().emitToUser(invitation.ownerId.toString(), 'contact.updated', {
      emergencyContactId: invitation.emergencyContactId,
      invitationRejected: true,
      reason:             input.reason
    });

    await logActivity({
      ownerId:            invitation.ownerId.toString(),
      emergencyContactId: invitation.emergencyContactId.toString(),
      activityType:       'INVITATION_REJECTED',
      description:        `"${invitation.contactName}" rejected the emergency contact invitation`,
      performedBy:        'CONTACT',
      performedByUserId:  userId,
      metadata:           { reason: input.reason },
      ipAddress
    });

    logger.info(`[EC] Invitation rejected: invitee=${userId}`);
  }

  // ────────────────────────────────────────────────────────────
  // NOTIFICATION DISPATCH ENGINE
  // ────────────────────────────────────────────────────────────

  /**
   * Dispatch an emergency alert to ALL active contacts of a user
   * ordered by the priority engine (primary first, then priority ASC).
   * Used by SOS, Guardian Stage 3, Crash Detection.
   */
  static async dispatchEmergencyToAll(params: {
    ownerId:     string;
    trigger:     EmergencyNotificationTrigger;
    title:       string;
    body:        string;
    sosId?:      string;
    sessionId?:  string;
    rideId?:     string;
  }): Promise<void> {
    const contacts = await EmergencyContact.find({
      ownerId:            params.ownerId,
      isSoftDeleted:      false,
      isActive:           true,
      availabilityStatus: { $ne: 'UNAVAILABLE' }
    });

    const ordered = sortByPriority(contacts as IEmergencyContact[]);

    for (const contact of ordered) {
      const notification = new EmergencyNotification({
        ownerId:            params.ownerId,
        emergencyContactId: contact._id,
        trigger:            params.trigger,
        sosIncidentId:      params.sosId,
        guardianSessionId:  params.sessionId,
        rideId:             params.rideId,
        messageTitle:       params.title,
        messageBody:        params.body,
        status:             'DISPATCHING',
        maxRetries:         3
      });

      await notification.save();
      await dispatchToContact(contact as IEmergencyContact, notification, params.title, params.body);
    }

    logger.info(`[EC] Emergency dispatch complete: owner=${params.ownerId} trigger=${params.trigger} contacts=${ordered.length}`);
  }

  // ────────────────────────────────────────────────────────────
  // ANALYTICS & HISTORY
  // ────────────────────────────────────────────────────────────

  /** Activity log for a user's emergency contacts */
  static async getActivityHistory(ownerId: string, limit = 50): Promise<InstanceType<typeof EmergencyContactActivity>[]> {
    return EmergencyContactActivity.find({ ownerId })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100))
      .lean() as any;
  }

  /** Analytics summary */
  static async getAnalytics(ownerId: string): Promise<Record<string, unknown>> {
    const [total, active, verified, primary, favourite] = await Promise.all([
      EmergencyContact.countDocuments({ ownerId, isSoftDeleted: false }),
      EmergencyContact.countDocuments({ ownerId, isSoftDeleted: false, isActive: true }),
      EmergencyContact.countDocuments({ ownerId, isSoftDeleted: false, verificationStatus: 'VERIFIED' }),
      EmergencyContact.countDocuments({ ownerId, isPrimary: true, isSoftDeleted: false }),
      EmergencyContact.countDocuments({ ownerId, isFavourite: true, isSoftDeleted: false })
    ]);

    const alertStats = await EmergencyContact.aggregate([
      { $match: { ownerId, isSoftDeleted: false } },
      { $group: {
          _id:             null,
          totalAlertsSent: { $sum: '$totalAlertsSent' },
          totalDelivered:  { $sum: '$totalAlertsDelivered' },
          totalFailed:     { $sum: '$totalAlertsFailed' }
      }}
    ]);

    const stats = alertStats[0] || { totalAlertsSent: 0, totalDelivered: 0, totalFailed: 0 };

    return {
      total,
      active,
      verified,
      unverified:     total - verified,
      hasPrimary:     primary > 0,
      favouriteCount: favourite,
      slotsRemaining: Math.max(0, MAX_CONTACTS - total),
      alertStats: {
        sent:      stats.totalAlertsSent,
        delivered: stats.totalDelivered,
        failed:    stats.totalFailed,
        successRate: stats.totalAlertsSent > 0
          ? ((stats.totalDelivered / stats.totalAlertsSent) * 100).toFixed(1) + '%'
          : 'N/A'
      }
    };
  }

  /** Get notification history for a specific contact */
  static async getContactNotifications(ownerId: string, contactId: string): Promise<InstanceType<typeof EmergencyNotification>[]> {
    // Verify ownership
    const contact = await EmergencyContact.findOne({ _id: contactId, ownerId, isSoftDeleted: false });
    if (!contact) throw new NotFoundError('Emergency contact not found');

    return EmergencyNotification.find({ emergencyContactId: contactId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean() as any;
  }

  /** Get pending invitations for the authenticated user (as invitee) */
  static async getPendingInvitations(userId: string): Promise<InstanceType<typeof EmergencyContactInvitation>[]> {
    return EmergencyContactInvitation.find({
      inviteeUserId:  userId,
      status:         'PENDING',
      tokenExpiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 }).lean() as any;
  }
}
