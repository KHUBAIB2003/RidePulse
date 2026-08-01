import { randomBytes } from 'crypto';
import { Guardian, IGuardian } from '../models/Guardian.model.js';
import { GuardianInvitation } from '../models/GuardianInvitation.model.js';
import { GuardianSession, IGuardianSession, EscalationStage } from '../models/GuardianSession.model.js';
import { GuardianActivity, GuardianActivityType } from '../models/GuardianActivity.model.js';
import { User } from '../models/User.model.js';
import { SocketManager } from '../sockets/socket.manager.js';
import {
  SendInvitationInput,
  AcceptInvitationInput,
  RejectInvitationInput,
  StartSessionInput,
  AcknowledgeCheckInInput,
  EndSessionInput,
  UpdateGuardianInput
} from '../validators/guardian.validator.js';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError
} from '../errors/httpExceptions.js';
import { logger } from '../utils/logger.util.js';

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const INVITATION_TTL_HOURS = 72;

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

async function logActivity(params: {
  riderId: string;
  activityType: GuardianActivityType;
  description: string;
  performedBy: 'RIDER' | 'GUARDIAN' | 'SYSTEM';
  performedByUserId?: string;
  guardianUserId?: string;
  guardianId?: string;
  sessionId?: string;
  invitationId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await GuardianActivity.create(params);
  } catch (err) {
    logger.error({ err }, '[GuardianService] Failed to write activity log');
  }
}

// ──────────────────────────────────────────────────────────────
// GuardianService
// ──────────────────────────────────────────────────────────────
export class GuardianService {

  // ────────────────────────────────────────────────────────────
  // INVITATIONS
  // ────────────────────────────────────────────────────────────

  /**
   * Rider invites another RidePulse user to be their guardian.
   */
  static async sendInvitation(riderId: string, input: SendInvitationInput): Promise<InstanceType<typeof GuardianInvitation>> {
    // Load rider info
    const rider = await User.findById(riderId).lean();
    if (!rider) throw new NotFoundError('Rider not found');

    // Resolve invitee by callsign
    const invitee = await User.findOne({
      callsign: { $regex: new RegExp(`^${input.inviteeCallsign}$`, 'i') },
      isSoftDeleted: false,
      accountStatus: 'ACTIVE'
    }).lean();
    if (!invitee) throw new NotFoundError(`No active RidePulse account found with callsign "${input.inviteeCallsign}"`);

    if (invitee._id.toString() === riderId) {
      throw new BadRequestError('You cannot invite yourself as a guardian');
    }

    // Check for existing active guardian relationship
    const existingGuardian = await Guardian.findOne({
      riderId,
      guardianUserId: invitee._id,
      isSoftDeleted: false,
      isActive: true
    });
    if (existingGuardian) throw new ConflictError('This user is already your active guardian');

    // Check for pending invitation
    const pendingInvitation = await GuardianInvitation.findOne({
      riderId,
      inviteeUserId: invitee._id,
      status: 'PENDING'
    });
    if (pendingInvitation) throw new ConflictError('A pending invitation already exists for this user');

    const expiresAt = new Date(Date.now() + INVITATION_TTL_HOURS * 3_600_000);

    const invitation = await GuardianInvitation.create({
      riderId,
      riderDisplayName: rider.displayName,
      riderCallsign:    rider.callsign,
      inviteeUserId:    invitee._id,
      inviteeDisplayName: invitee.displayName,
      inviteeCallsign:  invitee.callsign,
      label:            input.label,
      priority:         input.priority,
      requestedPermissions: input.permissions,
      message:          input.message,
      token:            generateToken(),
      tokenExpiresAt:   expiresAt
    });

    // Notify invitee via Socket.IO
    SocketManager.getInstance().emitToUser(invitee._id.toString(), 'guardian.invited', {
      invitationId:    invitation._id,
      riderDisplayName: rider.displayName,
      riderCallsign:    rider.callsign,
      label:            input.label,
      message:          input.message,
      expiresAt
    });

    await logActivity({
      riderId,
      activityType:      'INVITATION_SENT',
      description:       `Invitation sent to ${invitee.callsign} (${invitee.displayName})`,
      performedBy:       'RIDER',
      performedByUserId: riderId,
      guardianUserId:    invitee._id.toString(),
      invitationId:      invitation._id.toString(),
      metadata:          { label: input.label, priority: input.priority }
    });

    logger.info(`[Guardian] Invitation sent from rider ${riderId} to ${invitee.callsign}`);
    return invitation;
  }

  /**
   * Invitee accepts an invitation and becomes a guardian.
   */
  static async acceptInvitation(userId: string, input: AcceptInvitationInput): Promise<IGuardian> {
    const invitation = await GuardianInvitation.findById(input.invitationId);
    if (!invitation) throw new NotFoundError('Invitation not found');

    if (invitation.inviteeUserId.toString() !== userId) {
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

    const invitee = await User.findById(userId).lean();
    if (!invitee) throw new NotFoundError('User not found');

    // Create Guardian relationship
    const guardian = await Guardian.create({
      riderId:             invitation.riderId,
      guardianUserId:      userId,
      guardianDisplayName: invitee.displayName,
      guardianCallsign:    invitee.callsign,
      guardianPhone:       invitee.phoneNumber,
      label:               invitation.label,
      priority:            invitation.priority,
      permissions:         invitation.requestedPermissions,
      acceptedAt:          new Date()
    });

    // Update invitation status
    invitation.status = 'ACCEPTED';
    invitation.respondedAt = new Date();
    invitation.resultingGuardianId = guardian._id as any;
    await invitation.save();

    // Notify rider
    SocketManager.getInstance().emitToUser(invitation.riderId.toString(), 'guardian.accepted', {
      guardianId:          guardian._id,
      guardianDisplayName: invitee.displayName,
      guardianCallsign:    invitee.callsign,
      label:               guardian.label
    });

    await logActivity({
      riderId:           invitation.riderId.toString(),
      activityType:      'INVITATION_ACCEPTED',
      description:       `${invitee.callsign} accepted your guardian invitation`,
      performedBy:       'GUARDIAN',
      performedByUserId: userId,
      guardianUserId:    userId,
      guardianId:        guardian._id.toString(),
      invitationId:      invitation._id.toString()
    });

    logger.info(`[Guardian] Invitation accepted: rider=${invitation.riderId} guardian=${userId}`);
    return guardian;
  }

  /**
   * Invitee rejects an invitation.
   */
  static async rejectInvitation(userId: string, input: RejectInvitationInput): Promise<void> {
    const invitation = await GuardianInvitation.findById(input.invitationId);
    if (!invitation) throw new NotFoundError('Invitation not found');

    if (invitation.inviteeUserId.toString() !== userId) {
      throw new ForbiddenError('You are not the recipient of this invitation');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestError(`Invitation is already ${invitation.status}`);
    }

    invitation.status = 'REJECTED';
    invitation.respondedAt = new Date();
    invitation.rejectionReason = input.reason;
    await invitation.save();

    // Notify rider
    SocketManager.getInstance().emitToUser(invitation.riderId.toString(), 'guardian.rejected', {
      invitationId: invitation._id,
      inviteeCallsign: invitation.inviteeCallsign,
      reason: input.reason
    });

    await logActivity({
      riderId:           invitation.riderId.toString(),
      activityType:      'INVITATION_REJECTED',
      description:       `${invitation.inviteeCallsign} rejected your guardian invitation`,
      performedBy:       'GUARDIAN',
      performedByUserId: userId,
      guardianUserId:    userId,
      invitationId:      invitation._id.toString(),
      metadata:          { reason: input.reason }
    });

    logger.info(`[Guardian] Invitation rejected by userId=${userId}`);
  }

  // ────────────────────────────────────────────────────────────
  // GUARDIAN MANAGEMENT
  // ────────────────────────────────────────────────────────────

  /** Get all guardians for a rider */
  static async getMyGuardians(riderId: string): Promise<IGuardian[]> {
    return Guardian.find({ riderId, isSoftDeleted: false })
      .populate('guardianUserId', 'displayName callsign avatarUrl')
      .sort({ priority: 1 })
      .lean() as any;
  }

  /** Get all riders this user is guarding */
  static async getRidersIGuard(guardianUserId: string): Promise<IGuardian[]> {
    return Guardian.find({ guardianUserId, isSoftDeleted: false })
      .populate('riderId', 'displayName callsign avatarUrl')
      .sort({ priority: 1 })
      .lean() as any;
  }

  /** Get a single guardian record */
  static async getGuardianById(riderId: string, guardianId: string): Promise<IGuardian> {
    const guardian = await Guardian.findOne({ _id: guardianId, riderId, isSoftDeleted: false });
    if (!guardian) throw new NotFoundError('Guardian not found');
    return guardian;
  }

  /** Update guardian label, priority, permissions or active state */
  static async updateGuardian(riderId: string, guardianId: string, input: UpdateGuardianInput): Promise<IGuardian> {
    const guardian = await Guardian.findOne({ _id: guardianId, riderId, isSoftDeleted: false });
    if (!guardian) throw new NotFoundError('Guardian not found');

    const changes: Record<string, unknown> = {};

    if (input.label !== undefined)       { guardian.label       = input.label;       changes.label = input.label; }
    if (input.priority !== undefined)    { guardian.priority    = input.priority;    changes.priority = input.priority; }
    if (input.permissions !== undefined) { guardian.permissions = input.permissions; changes.permissions = input.permissions; }
    if (input.isActive !== undefined)    { guardian.isActive    = input.isActive;    changes.isActive = input.isActive; }

    await guardian.save();

    if (input.isActive === false) {
      await logActivity({
        riderId,
        activityType:   'GUARDIAN_DEACTIVATED',
        description:    `Guardian ${guardian.guardianCallsign} deactivated`,
        performedBy:    'RIDER',
        performedByUserId: riderId,
        guardianUserId: guardian.guardianUserId.toString(),
        guardianId:     guardianId,
        metadata:       changes
      });
    } else if (input.isActive === true) {
      await logActivity({
        riderId,
        activityType:   'GUARDIAN_REACTIVATED',
        description:    `Guardian ${guardian.guardianCallsign} reactivated`,
        performedBy:    'RIDER',
        performedByUserId: riderId,
        guardianUserId: guardian.guardianUserId.toString(),
        guardianId:     guardianId
      });
    }

    return guardian;
  }

  /** Soft-delete (remove) a guardian */
  static async removeGuardian(riderId: string, guardianId: string): Promise<void> {
    const guardian = await Guardian.findOne({ _id: guardianId, riderId, isSoftDeleted: false });
    if (!guardian) throw new NotFoundError('Guardian not found');

    guardian.isSoftDeleted = true;
    guardian.deletedAt = new Date();
    guardian.isActive = false;
    await guardian.save();

    SocketManager.getInstance().emitToUser(guardian.guardianUserId.toString(), 'guardian.removed', {
      guardianId,
      riderCallsign: 'Rider'
    });

    await logActivity({
      riderId,
      activityType:      'GUARDIAN_DEACTIVATED',
      description:       `Guardian ${guardian.guardianCallsign} removed`,
      performedBy:       'RIDER',
      performedByUserId: riderId,
      guardianUserId:    guardian.guardianUserId.toString(),
      guardianId:        guardianId
    });
  }

  // ────────────────────────────────────────────────────────────
  // MONITORING SESSIONS
  // ────────────────────────────────────────────────────────────

  /**
   * Start a guardian monitoring session for a ride.
   */
  static async startSession(riderId: string, input: StartSessionInput): Promise<IGuardianSession> {
    // Verify guardian relationship exists and is active
    const guardian = await Guardian.findOne({
      _id: input.guardianId,
      riderId,
      isActive: true,
      isSoftDeleted: false
    });
    if (!guardian) throw new NotFoundError('Guardian not found or not active');

    // Only one active session per guardian per rider
    const existingSession = await GuardianSession.findOne({
      riderId,
      guardianId: input.guardianId,
      status: 'ACTIVE',
      isSoftDeleted: false
    });
    if (existingSession) throw new ConflictError('A monitoring session is already active with this guardian');

    const startedAt = new Date();
    const firstWindowScheduledAt = addMinutes(startedAt, input.intervalMinutes);

    const firstWindow = {
      windowIndex:   0,
      scheduledAt:   firstWindowScheduledAt,
      graceDeadline: addMinutes(firstWindowScheduledAt, input.gracePeriodMinutes),
      status:        'SCHEDULED' as const,
      escalationStage: 0 as EscalationStage
    };

    const session = await GuardianSession.create({
      riderId,
      rideId:            input.rideId,
      guardianId:        input.guardianId,
      guardianUserId:    guardian.guardianUserId,
      title:             input.title,
      intervalMinutes:   input.intervalMinutes,
      gracePeriodMinutes: input.gracePeriodMinutes,
      windows:           [firstWindow],
      totalWindows:      1,
      startedAt,
      riderStartLocation: input.latitude && input.longitude
        ? { type: 'Point', coordinates: [input.longitude, input.latitude] }
        : undefined
    });

    // Increment guardian session counter
    await Guardian.findByIdAndUpdate(input.guardianId, { $inc: { totalSessionsMonitored: 1 } });

    // Notify guardian
    SocketManager.getInstance().emitToUser(guardian.guardianUserId.toString(), 'guardian.started', {
      sessionId:       session._id,
      riderId,
      title:           input.title,
      intervalMinutes: input.intervalMinutes,
      firstCheckIn:    firstWindowScheduledAt
    });

    await logActivity({
      riderId,
      activityType:      'SESSION_STARTED',
      description:       `Guardian monitoring session started with ${guardian.guardianCallsign}`,
      performedBy:       'RIDER',
      performedByUserId: riderId,
      guardianUserId:    guardian.guardianUserId.toString(),
      guardianId:        input.guardianId,
      sessionId:         session._id.toString(),
      metadata:          { intervalMinutes: input.intervalMinutes, rideId: input.rideId }
    });

    logger.info(`[Guardian] Session started: rider=${riderId} session=${session._id}`);
    return session;
  }

  /**
   * Rider manually acknowledges a check-in window.
   */
  static async acknowledgeCheckIn(riderId: string, input: AcknowledgeCheckInInput): Promise<IGuardianSession> {
    const session = await GuardianSession.findOne({
      _id: input.sessionId,
      riderId,
      status: 'ACTIVE',
      isSoftDeleted: false
    });
    if (!session) throw new NotFoundError('Active guardian session not found');

    // Find the current pending window
    const pendingWindow = session.windows.find(
      w => w.status === 'SCHEDULED' || w.status === 'REMINDER_SENT'
    );
    if (!pendingWindow) throw new BadRequestError('No pending check-in window found');

    const now = new Date();
    pendingWindow.acknowledgedAt = now;
    pendingWindow.status = 'ACKNOWLEDGED';
    if (input.note)      pendingWindow.note = input.note;
    if (input.latitude && input.longitude) {
      pendingWindow.location = {
        type: 'Point',
        coordinates: [input.longitude, input.latitude]
      };
    }

    session.completedWindows += 1;
    session.escalationStage = 0 as EscalationStage;

    // Update last known location
    if (input.latitude && input.longitude) {
      session.lastKnownLocation = {
        type: 'Point',
        coordinates: [input.longitude, input.latitude]
      };
    }

    // Schedule the next window
    const nextScheduledAt = addMinutes(now, session.intervalMinutes);
    session.windows.push({
      windowIndex:    session.windows.length,
      scheduledAt:    nextScheduledAt,
      graceDeadline:  addMinutes(nextScheduledAt, session.gracePeriodMinutes),
      status:         'SCHEDULED',
      escalationStage: 0 as EscalationStage
    });
    session.totalWindows = session.windows.length;

    await session.save();

    // Notify guardian of successful check-in
    SocketManager.getInstance().emitToUser(session.guardianUserId.toString(), 'guardian.checkin', {
      sessionId:   session._id,
      windowIndex: pendingWindow.windowIndex,
      status:      'ACKNOWLEDGED',
      acknowledgedAt: now,
      nextCheckIn: nextScheduledAt,
      location:    pendingWindow.location
    });

    await logActivity({
      riderId,
      activityType:      'CHECKIN_ACKNOWLEDGED',
      description:       `Check-in #${pendingWindow.windowIndex + 1} acknowledged`,
      performedBy:       'RIDER',
      performedByUserId: riderId,
      guardianUserId:    session.guardianUserId.toString(),
      guardianId:        session.guardianId.toString(),
      sessionId:         session._id.toString(),
      metadata:          { windowIndex: pendingWindow.windowIndex }
    });

    return session;
  }

  /**
   * Internal: Process missed check-in windows and run escalation logic.
   * Called by a periodic cron/scheduler — not directly exposed via HTTP.
   */
  static async processMissedCheckIns(): Promise<void> {
    const now = new Date();

    // Find active sessions with windows past their grace deadline
    const sessions = await GuardianSession.find({
      status: 'ACTIVE',
      isSoftDeleted: false,
      'windows': {
        $elemMatch: {
          status: { $in: ['SCHEDULED', 'REMINDER_SENT'] },
          graceDeadline: { $lte: now }
        }
      }
    }).populate('guardianId', 'guardianUserId guardianCallsign');

    for (const session of sessions) {
      for (const window of session.windows) {
        if (
          (window.status === 'SCHEDULED' || window.status === 'REMINDER_SENT') &&
          window.graceDeadline <= now
        ) {
          await GuardianService.escalateWindow(session, window.windowIndex);
        }
      }
    }
  }

  /**
   * Internal escalation state machine for a missed window.
   */
  static async escalateWindow(session: IGuardianSession, windowIndex: number): Promise<void> {
    const window = session.windows[windowIndex];
    if (!window) return;

    const currentStage = (session.escalationStage ?? 0) as EscalationStage;
    const nextStage = Math.min(currentStage + 1, 4) as EscalationStage;

    window.escalationStage = nextStage;
    window.missedAt = window.missedAt || new Date();
    session.escalationStage = nextStage;

    switch (nextStage) {
      case 1:
        // Stage 1: Reminder to rider
        window.status = 'REMINDER_SENT';
        window.reminderSentAt = new Date();
        SocketManager.getInstance().emitToUser(session.riderId.toString(), 'guardian.missed', {
          sessionId:   session._id,
          windowIndex,
          stage:       1,
          message:     'Guardian check-in reminder: Please check in now'
        });
        break;

      case 2:
        // Stage 2: Notify guardian
        window.status = 'ESCALATED';
        session.missedWindows += 1;
        SocketManager.getInstance().emitToUser(session.guardianUserId.toString(), 'guardian.missed', {
          sessionId:   session._id,
          riderId:     session.riderId,
          windowIndex,
          stage:       2,
          message:     'ALERT: Rider has missed a safety check-in'
        });
        await logActivity({
          riderId:        session.riderId.toString(),
          activityType:   'CHECKIN_MISSED',
          description:    `Check-in #${windowIndex + 1} missed – Guardian notified (Stage 2)`,
          performedBy:    'SYSTEM',
          guardianUserId: session.guardianUserId.toString(),
          guardianId:     session.guardianId.toString(),
          sessionId:      session._id.toString(),
          metadata:       { windowIndex, stage: 2 }
        });
        break;

      case 3:
        // Stage 3: Notify emergency contacts (via notification engine)
        SocketManager.getInstance().emitToRoom('room:admin:guardian', 'guardian.escalated', {
          sessionId: session._id,
          riderId:   session.riderId,
          stage:     3,
          message:   'CRITICAL: Rider missed multiple check-ins – Emergency contacts alerted'
        });
        await logActivity({
          riderId:        session.riderId.toString(),
          activityType:   'CHECKIN_ESCALATED',
          description:    `Check-in escalated to Stage 3 – Emergency contacts notified`,
          performedBy:    'SYSTEM',
          guardianUserId: session.guardianUserId.toString(),
          guardianId:     session.guardianId.toString(),
          sessionId:      session._id.toString(),
          metadata:       { windowIndex, stage: 3 }
        });
        break;

      case 4:
        // Stage 4: Automatic SOS recommendation (architecture only — no auto-trigger)
        SocketManager.getInstance().emitToUser(session.riderId.toString(), 'guardian.escalated', {
          sessionId:   session._id,
          stage:       4,
          message:     'CRITICAL: Rider is unresponsive. SOS activation is recommended.',
          sosRecommended: true
        });
        await logActivity({
          riderId:        session.riderId.toString(),
          activityType:   'SOS_RECOMMENDED',
          description:    `Stage 4 escalation reached – SOS activation recommended`,
          performedBy:    'SYSTEM',
          guardianUserId: session.guardianUserId.toString(),
          guardianId:     session.guardianId.toString(),
          sessionId:      session._id.toString(),
          metadata:       { windowIndex, stage: 4 }
        });
        break;

      default:
        break;
    }

    await session.save();
  }

  /**
   * End a guardian monitoring session.
   */
  static async endSession(riderId: string, input: EndSessionInput): Promise<IGuardianSession> {
    const session = await GuardianSession.findOne({
      _id: input.sessionId,
      riderId,
      isSoftDeleted: false
    });
    if (!session) throw new NotFoundError('Guardian session not found');

    if (session.status !== 'ACTIVE') {
      throw new BadRequestError(`Session is already ${session.status}`);
    }

    const now = new Date();

    // Cancel all remaining scheduled windows
    for (const window of session.windows) {
      if (window.status === 'SCHEDULED' || window.status === 'REMINDER_SENT') {
        window.status = 'CANCELLED';
      }
    }

    session.status = 'COMPLETED';
    session.endedAt = now;
    session.endedBy = 'RIDER';
    session.endReason = input.reason;
    await session.save();

    // Notify guardian
    SocketManager.getInstance().emitToUser(session.guardianUserId.toString(), 'guardian.completed', {
      sessionId: session._id,
      riderId,
      completedWindows: session.completedWindows,
      missedWindows:    session.missedWindows,
      endedAt:          now
    });

    await logActivity({
      riderId,
      activityType:      'SESSION_ENDED',
      description:       `Guardian session ended: ${input.reason}`,
      performedBy:       'RIDER',
      performedByUserId: riderId,
      guardianUserId:    session.guardianUserId.toString(),
      guardianId:        session.guardianId.toString(),
      sessionId:         session._id.toString(),
      metadata:          { completedWindows: session.completedWindows, missedWindows: session.missedWindows }
    });

    logger.info(`[Guardian] Session ended: session=${session._id} rider=${riderId}`);
    return session;
  }

  // ────────────────────────────────────────────────────────────
  // QUERIES
  // ────────────────────────────────────────────────────────────

  /** Get active session for a rider */
  static async getActiveSession(riderId: string): Promise<IGuardianSession | null> {
    return GuardianSession.findOne({ riderId, status: 'ACTIVE', isSoftDeleted: false })
      .populate('guardianId', 'label priority guardianDisplayName guardianCallsign')
      .lean() as any;
  }

  /** Get session by ID */
  static async getSessionById(userId: string, sessionId: string): Promise<IGuardianSession> {
    const session = await GuardianSession.findOne({
      _id: sessionId,
      isSoftDeleted: false
    });
    if (!session) throw new NotFoundError('Session not found');

    // Either rider or guardian can access
    if (
      session.riderId.toString() !== userId &&
      session.guardianUserId.toString() !== userId
    ) {
      throw new ForbiddenError('Access denied');
    }

    return session;
  }

  /** History of sessions for a rider */
  static async getSessionHistory(riderId: string): Promise<IGuardianSession[]> {
    return GuardianSession.find({ riderId, isSoftDeleted: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean() as any;
  }

  /** Guardian analytics for a rider */
  static async getAnalytics(riderId: string): Promise<Record<string, unknown>> {
    const [totalGuardians, activeSessions, totalSessions, totalActivities] = await Promise.all([
      Guardian.countDocuments({ riderId, isSoftDeleted: false }),
      GuardianSession.countDocuments({ riderId, status: 'ACTIVE', isSoftDeleted: false }),
      GuardianSession.countDocuments({ riderId, isSoftDeleted: false }),
      GuardianActivity.countDocuments({ riderId })
    ]);

    const missedCheckIns = await GuardianActivity.countDocuments({
      riderId,
      activityType: 'CHECKIN_MISSED'
    });

    const completedCheckIns = await GuardianActivity.countDocuments({
      riderId,
      activityType: 'CHECKIN_ACKNOWLEDGED'
    });

    return {
      totalGuardians,
      activeSessions,
      totalSessions,
      totalActivities,
      missedCheckIns,
      completedCheckIns,
      checkInCompletionRate: completedCheckIns + missedCheckIns > 0
        ? ((completedCheckIns / (completedCheckIns + missedCheckIns)) * 100).toFixed(1)
        : '100.0'
    };
  }

  /** Get pending invitations for the authenticated user (as invitee) */
  static async getPendingInvitations(userId: string): Promise<InstanceType<typeof GuardianInvitation>[]> {
    return GuardianInvitation.find({
      inviteeUserId: userId,
      status: 'PENDING',
      tokenExpiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 }).lean() as any;
  }

  /** Get sent invitations (as rider) */
  static async getSentInvitations(riderId: string): Promise<InstanceType<typeof GuardianInvitation>[]> {
    return GuardianInvitation.find({ riderId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean() as any;
  }

  /** Get guardian activity history */
  static async getActivityHistory(riderId: string, limit = 50): Promise<InstanceType<typeof GuardianActivity>[]> {
    return GuardianActivity.find({ riderId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as any;
  }
}
