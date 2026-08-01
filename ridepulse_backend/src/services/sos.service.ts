import { SOSIncident, ISOSIncident } from '../models/SOSIncident.model.js';
import { User } from '../models/User.model.js';
import { SocketManager } from '../sockets/socket.manager.js';
import { notificationEngine } from '../abstractions/notification.abstraction.js';
import { 
  StartSOSInput, 
  CancelSOSInput, 
  TriggerSOSInput, 
  AddSOSLocationInput, 
  ResolveSOSInput,
  AdminCloseSOSInput,
  AdminEscalateSOSInput 
} from '../validators/sos.validator.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../errors/httpExceptions.js';

export class SOSService {
  /**
   * Start a new SOS emergency countdown session
   */
  static async startSOS(userId: string, input: StartSOSInput): Promise<ISOSIncident> {
    const activeIncident = await SOSIncident.findOne({
      userId,
      status: { $in: ['COUNTDOWN', 'TRIGGERED', 'DISPATCHING', 'TRACKING'] },
      isSoftDeleted: false
    });

    if (activeIncident) {
      throw new BadRequestError(`An active SOS emergency incident is already in progress (ID: ${activeIncident._id})`);
    }

    const initialStatus = input.countdownSeconds === 0 ? 'TRIGGERED' : 'COUNTDOWN';

    const incident = new SOSIncident({
      userId,
      bikeId: input.bikeId,
      status: initialStatus,
      category: input.category || 'ACCIDENT',
      severity: input.severity || 'HIGH',
      countdownSeconds: input.countdownSeconds,
      escalationLevel: input.severity === 'CRITICAL' ? 3 : 1,
      location: {
        type: 'Point',
        coordinates: [input.longitude, input.latitude]
      },
      altitude: input.altitude || 0,
      batteryPercentage: input.batteryPercentage || 100,
      networkType: input.networkType || '4G',
      liveTrackpoints: [],
      timeline: [],
      dispatchQueue: []
    });

    incident.timeline.push({
      event: initialStatus === 'TRIGGERED' ? 'SOS_TRIGGERED_IMMEDIATE' : 'COUNTDOWN_STARTED',
      description: `SOS ${initialStatus === 'TRIGGERED' ? 'triggered immediately' : `countdown initiated (${input.countdownSeconds}s)`}`,
      timestamp: new Date(),
      performedBy: 'Rider',
      metadata: { category: incident.category, severity: incident.severity }
    });

    if (initialStatus === 'TRIGGERED') {
      incident.triggerTime = new Date();
    }

    await incident.save();

    // Broadcast Socket.IO events
    SocketManager.getInstance().emitToUser(userId, 'sos.created', {
      sosId: incident._id,
      status: incident.status,
      category: incident.category,
      severity: incident.severity,
      countdownSeconds: incident.countdownSeconds
    });

    SocketManager.getInstance().emitToRoom('room:admin:sos', 'admin.sos.created', {
      sosId: incident._id,
      userId: incident.userId,
      status: incident.status,
      location: incident.location
    });

    // If triggered immediately, initiate emergency dispatch
    if (initialStatus === 'TRIGGERED') {
      await this.dispatchEmergencyNotifications(incident);
    }

    return incident;
  }

  /**
   * Cancel an active SOS countdown before triggering
   */
  static async cancelSOS(userId: string, input: CancelSOSInput): Promise<ISOSIncident> {
    const incident = await SOSIncident.findOne({ _id: input.sosId, userId, isSoftDeleted: false });
    if (!incident) throw new NotFoundError('SOS incident not found');

    if (incident.status === 'RESOLVED' || incident.status === 'CANCELLED') {
      throw new BadRequestError(`Cannot cancel incident with status ${incident.status}`);
    }

    incident.status = 'CANCELLED';
    incident.resolvedTime = new Date();
    incident.durationSeconds = Math.round((incident.resolvedTime.getTime() - new Date(incident.createdAt).getTime()) / 1000);

    incident.timeline.push({
      event: 'SOS_CANCELLED',
      description: `SOS cancelled by rider: ${input.reason}`,
      timestamp: new Date(),
      performedBy: 'Rider',
      metadata: { reason: input.reason }
    });

    await incident.save();

    SocketManager.getInstance().emitToUser(userId, 'sos.cancelled', {
      sosId: incident._id,
      reason: input.reason
    });

    SocketManager.getInstance().emitToRoom('room:admin:sos', 'admin.sos.updated', {
      sosId: incident._id,
      status: 'CANCELLED'
    });

    return incident;
  }

  /**
   * Manually trigger SOS emergency signal (e.g. countdown elapsed or rider pressed Trigger Now)
   */
  static async triggerSOS(userId: string, input: TriggerSOSInput): Promise<ISOSIncident> {
    const incident = await SOSIncident.findOne({ _id: input.sosId, userId, isSoftDeleted: false });
    if (!incident) throw new NotFoundError('SOS incident not found');

    if (incident.status === 'RESOLVED' || incident.status === 'CANCELLED') {
      throw new BadRequestError(`Cannot trigger incident in ${incident.status} state`);
    }

    incident.status = 'DISPATCHING';
    incident.triggerTime = new Date();
    if (input.category) incident.category = input.category;
    if (input.severity) incident.severity = input.severity;
    if (input.manualNotes) incident.manualNotes = input.manualNotes;

    incident.timeline.push({
      event: 'SOS_TRIGGERED',
      description: `Emergency SOS triggered (${incident.category} - ${incident.severity})`,
      timestamp: new Date(),
      performedBy: 'Rider',
      metadata: { manualNotes: input.manualNotes }
    });

    await incident.save();

    SocketManager.getInstance().emitToUser(userId, 'sos.updated', {
      sosId: incident._id,
      status: incident.status,
      triggerTime: incident.triggerTime
    });

    // Execute emergency notification dispatch
    await this.dispatchEmergencyNotifications(incident);

    incident.status = 'TRACKING';
    await incident.save();

    return incident;
  }

  /**
   * Stream high-frequency emergency location update
   */
  static async addLocation(userId: string, input: AddSOSLocationInput): Promise<ISOSIncident> {
    const incident = await SOSIncident.findOne({ _id: input.sosId, userId, isSoftDeleted: false });
    if (!incident) throw new NotFoundError('SOS incident not found');

    if (incident.status === 'RESOLVED' || incident.status === 'CANCELLED' || incident.status === 'EXPIRED') {
      throw new BadRequestError(`Cannot update location for finished incident (${incident.status})`);
    }

    const speedKmh = input.speed ? parseFloat((input.speed > 50 ? input.speed : input.speed * 3.6).toFixed(2)) : 0;
    const now = new Date();

    incident.location = {
      type: 'Point',
      coordinates: [input.longitude, input.latitude]
    };
    incident.altitude = input.altitude || incident.altitude;
    incident.accuracy = input.accuracy || incident.accuracy;
    incident.bearing = input.bearing || incident.bearing;
    incident.speedKmh = speedKmh;
    if (input.batteryPercentage !== undefined) incident.batteryPercentage = input.batteryPercentage;
    if (input.networkType) incident.networkType = input.networkType;

    incident.liveTrackpoints.push({
      location: {
        type: 'Point',
        coordinates: [input.longitude, input.latitude]
      },
      altitude: input.altitude || 0,
      accuracy: input.accuracy || 0,
      bearing: input.bearing || 0,
      speedKmh,
      heading: input.heading || input.bearing || 0,
      timestamp: now,
      provider: input.provider || 'gps',
      batteryPercentage: input.batteryPercentage,
      networkType: input.networkType
    });

    incident.timeline.push({
      event: 'LOCATION_UPDATED',
      description: `Live emergency GPS update: [${input.latitude}, ${input.longitude}] (${speedKmh} km/h)`,
      timestamp: now,
      performedBy: 'Telemetry Engine'
    });

    await incident.save();

    SocketManager.getInstance().emitToUser(userId, 'sos.location.updated', {
      sosId: incident._id,
      location: incident.location,
      speedKmh,
      batteryPercentage: incident.batteryPercentage
    });

    SocketManager.getInstance().emitToRoom('room:admin:sos', 'admin.sos.updated', {
      sosId: incident._id,
      location: incident.location,
      speedKmh
    });

    return incident;
  }

  /**
   * Mark SOS incident resolved safely by rider
   */
  static async resolveSOS(userId: string, input: ResolveSOSInput): Promise<ISOSIncident> {
    const incident = await SOSIncident.findOne({ _id: input.sosId, userId, isSoftDeleted: false });
    if (!incident) throw new NotFoundError('SOS incident not found');

    if (incident.status === 'RESOLVED' || incident.status === 'CANCELLED') {
      throw new BadRequestError(`Incident is already ${incident.status}`);
    }

    const resolvedTime = new Date();
    incident.status = 'RESOLVED';
    incident.resolvedTime = resolvedTime;
    incident.durationSeconds = Math.round((resolvedTime.getTime() - new Date(incident.createdAt).getTime()) / 1000);
    if (input.notes) incident.manualNotes = input.notes;

    incident.timeline.push({
      event: 'SOS_RESOLVED',
      description: `SOS resolved: ${input.notes}`,
      timestamp: resolvedTime,
      performedBy: 'Rider'
    });

    await incident.save();

    SocketManager.getInstance().emitToUser(userId, 'sos.resolved', {
      sosId: incident._id,
      resolvedAt: resolvedTime
    });

    SocketManager.getInstance().emitToRoom('room:admin:sos', 'admin.sos.updated', {
      sosId: incident._id,
      status: 'RESOLVED'
    });

    return incident;
  }

  /**
   * Get active ongoing SOS incident for current rider
   */
  static async getCurrentActiveSOS(userId: string): Promise<ISOSIncident | null> {
    return SOSIncident.findOne({
      userId,
      status: { $in: ['COUNTDOWN', 'TRIGGERED', 'DISPATCHING', 'TRACKING'] },
      isSoftDeleted: false
    }).exec();
  }

  /**
   * Get rider SOS history
   */
  static async getSOSHistory(userId: string): Promise<ISOSIncident[]> {
    return SOSIncident.find({ userId, isSoftDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get single SOS incident details
   */
  static async getSOSById(sosId: string, userId: string, isAdmin = false): Promise<ISOSIncident> {
    const incident = await SOSIncident.findOne({ _id: sosId, isSoftDeleted: false });
    if (!incident) throw new NotFoundError('SOS incident not found');

    if (!isAdmin && incident.userId.toString() !== userId) {
      throw new ForbiddenError('Access denied: Incident belongs to another rider');
    }

    return incident;
  }

  /**
   * Get SOS incident timeline
   */
  static async getSOSTimeline(sosId: string, userId: string, isAdmin = false): Promise<any> {
    const incident = await this.getSOSById(sosId, userId, isAdmin);
    return {
      sosId: incident._id,
      status: incident.status,
      category: incident.category,
      severity: incident.severity,
      timeline: incident.timeline
    };
  }

  /**
   * Soft-delete an SOS record
   */
  static async deleteSOS(sosId: string, userId: string, isAdmin = false): Promise<boolean> {
    const incident = await this.getSOSById(sosId, userId, isAdmin);
    incident.isSoftDeleted = true;
    incident.deletedAt = new Date();
    await incident.save();
    return true;
  }

  /**
   * Admin: Get all active and historical SOS emergency incidents across system
   */
  static async getAllIncidentsAdmin(): Promise<ISOSIncident[]> {
    return SOSIncident.find({ isSoftDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Admin: Force close an active emergency SOS incident
   */
  static async adminForceClose(sosId: string, input: AdminCloseSOSInput): Promise<ISOSIncident> {
    const incident = await SOSIncident.findOne({ _id: sosId, isSoftDeleted: false });
    if (!incident) throw new NotFoundError('SOS incident not found');

    incident.status = 'RESOLVED';
    incident.resolvedTime = new Date();
    incident.durationSeconds = Math.round((incident.resolvedTime.getTime() - new Date(incident.createdAt).getTime()) / 1000);

    incident.timeline.push({
      event: 'FORCE_CLOSED_BY_ADMIN',
      description: `Incident force-closed by Safety Admin: ${input.reason}`,
      timestamp: new Date(),
      performedBy: 'Safety Admin',
      metadata: { reason: input.reason }
    });

    await incident.save();

    SocketManager.getInstance().emitToUser(incident.userId.toString(), 'sos.resolved', {
      sosId: incident._id,
      reason: input.reason
    });

    return incident;
  }

  /**
   * Admin: Escalate incident severity and escalation level (1-5)
   */
  static async adminEscalate(sosId: string, input: AdminEscalateSOSInput): Promise<ISOSIncident> {
    const incident = await SOSIncident.findOne({ _id: sosId, isSoftDeleted: false });
    if (!incident) throw new NotFoundError('SOS incident not found');

    if (input.newSeverity) incident.severity = input.newSeverity;
    if (input.newEscalationLevel) incident.escalationLevel = input.newEscalationLevel;

    incident.timeline.push({
      event: 'ESCALATED_BY_ADMIN',
      description: `Incident escalated by Safety Admin (Level ${incident.escalationLevel}, Severity ${incident.severity}): ${input.reason}`,
      timestamp: new Date(),
      performedBy: 'Safety Admin',
      metadata: { reason: input.reason, escalationLevel: incident.escalationLevel }
    });

    await incident.save();

    SocketManager.getInstance().emitToUser(incident.userId.toString(), 'sos.updated', {
      sosId: incident._id,
      severity: incident.severity,
      escalationLevel: incident.escalationLevel
    });

    return incident;
  }

  /**
   * Dispatch emergency notifications to rider's emergency contacts
   */
  private static async dispatchEmergencyNotifications(incident: ISOSIncident): Promise<void> {
    const user = await User.findById(incident.userId);
    if (!user || !user.emergencyContacts || user.emergencyContacts.length === 0) {
      incident.timeline.push({
        event: 'DISPATCH_NO_CONTACTS',
        description: 'No emergency contacts found on rider profile. Safety team alerted.',
        timestamp: new Date(),
        performedBy: 'Notification Dispatch Engine'
      });
      return;
    }

    const emergencyUrl = `https://ridepulse.app/sos/live/${incident._id}`;

    for (const contact of user.emergencyContacts) {
      const contactData = contact as unknown as { name: string; phone: string; relationship: string; preferredContactMethod: string };
      const phone = contactData.phone || '';
      const message = `EMERGENCY ALERT: Rider ${user.displayName} triggered an SOS emergency (${incident.category}). Live Location: ${emergencyUrl}`;

      // Dispatch SMS notification via zero-cost provider abstraction
      const smsResult = await notificationEngine.sendSms(phone, message);

      incident.dispatchQueue.push({
        contactName: contactData.name,
        phoneNumber: phone,
        relationship: contactData.relationship || 'Emergency Contact',
        channel: 'SMS',
        status: smsResult.success ? 'SENT' : 'FAILED',
        dispatchedAt: new Date(),
        messageId: smsResult.messageId
      });
    }

    incident.timeline.push({
      event: 'DISPATCH_COMPLETED',
      description: `Emergency alerts dispatched to ${user.emergencyContacts.length} contact(s)`,
      timestamp: new Date(),
      performedBy: 'Notification Dispatch Engine'
    });

    await incident.save();
  }
}
