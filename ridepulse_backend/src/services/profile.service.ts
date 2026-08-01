import { User, IUser, IEmergencyContact } from '../models/User.model.js';
import { Session } from '../models/Session.model.js';
import { ActivityLog } from '../models/ActivityLog.model.js';
import { RefreshToken } from '../models/RefreshToken.model.js';
import { MockStorageProvider } from '../abstractions/storage.abstraction.js';
import { UpdateProfileInput, UpdatePreferencesInput, EmergencyContactInput } from '../validators/profile.validator.js';
import { NotFoundError, BadRequestError } from '../errors/httpExceptions.js';
import { formatPaginatedData, PaginatedResult } from '../utils/pagination.util.js';

export class ProfileService {
  private static storageProvider = new MockStorageProvider();

  static async getProfile(userId: string): Promise<Partial<IUser>> {
    const user = await User.findOne({ _id: userId, isSoftDeleted: false }).select('-passwordHash -passwordHistory');
    if (!user) throw new NotFoundError('User profile not found');
    return user;
  }

  static async updateProfile(userId: string, input: UpdateProfileInput): Promise<Partial<IUser>> {
    const user = await User.findOne({ _id: userId, isSoftDeleted: false });
    if (!user) throw new NotFoundError('User not found');

    if (input.callsign && input.callsign !== user.callsign) {
      const callsignExists = await User.findOne({ callsign: input.callsign, _id: { $ne: userId } });
      if (callsignExists) throw new BadRequestError('Callsign is already taken');
    }

    Object.assign(user, input);
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'PROFILE_UPDATED',
      metadata: { fields: Object.keys(input) }
    });

    const updated = await User.findById(userId).select('-passwordHash -passwordHistory');
    return updated!;
  }

  static async updatePreferences(userId: string, input: UpdatePreferencesInput): Promise<Partial<IUser>> {
    const user = await User.findOne({ _id: userId, isSoftDeleted: false });
    if (!user) throw new NotFoundError('User not found');

    if (input.theme) user.theme = input.theme;
    if (input.notificationPreferences) Object.assign(user.notificationPreferences, input.notificationPreferences);
    if (input.privacySettings) Object.assign(user.privacySettings, input.privacySettings);
    if (input.ridePreferences) Object.assign(user.ridePreferences, input.ridePreferences);

    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'PREFERENCES_UPDATED'
    });

    const updated = await User.findById(userId).select('-passwordHash -passwordHistory');
    return updated!;
  }

  static async uploadAvatar(userId: string, fileBuffer: Buffer, filename: string, mimeType: string): Promise<{ avatarUrl: string }> {
    const user = await User.findOne({ _id: userId, isSoftDeleted: false });
    if (!user) throw new NotFoundError('User not found');

    const result = await this.storageProvider.uploadFile(fileBuffer, filename, mimeType, 'avatars');
    user.avatarUrl = result.url;
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'AVATAR_UPLOADED',
      metadata: { avatarUrl: result.url }
    });

    return { avatarUrl: result.url };
  }

  static async deleteAvatar(userId: string): Promise<boolean> {
    const user = await User.findOne({ _id: userId, isSoftDeleted: false });
    if (!user) throw new NotFoundError('User not found');

    user.avatarUrl = '';
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'AVATAR_DELETED'
    });

    return true;
  }

  static async getSessions(userId: string): Promise<any[]> {
    return Session.find({ userId }).sort({ lastActive: -1 }).exec();
  }

  static async deleteSession(userId: string, sessionId: string): Promise<boolean> {
    await Session.deleteOne({ userId, sessionId });
    await ActivityLog.create({
      userId,
      action: 'SESSION_TERMINATED',
      metadata: { sessionId }
    });
    return true;
  }

  static async deleteOtherSessions(userId: string, currentSessionId?: string): Promise<boolean> {
    const query: any = { userId };
    if (currentSessionId) query.sessionId = { $ne: currentSessionId };

    await Session.deleteMany(query);
    await ActivityLog.create({
      userId,
      action: 'OTHER_SESSIONS_TERMINATED'
    });
    return true;
  }

  static async getActivityLogs(userId: string, page = 1, limit = 20): Promise<PaginatedResult<any>> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ActivityLog.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      ActivityLog.countDocuments({ userId }).exec()
    ]);
    return formatPaginatedData(items, total, page, limit);
  }

  static async addEmergencyContact(userId: string, input: EmergencyContactInput): Promise<IEmergencyContact[]> {
    const user = await User.findOne({ _id: userId, isSoftDeleted: false });
    if (!user) throw new NotFoundError('User not found');

    if (user.emergencyContacts.length >= 5) {
      throw new BadRequestError('Maximum 5 emergency contacts permitted');
    }

    user.emergencyContacts.push(input as any);
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'EMERGENCY_CONTACT_ADDED',
      metadata: { contactName: input.name }
    });

    return user.emergencyContacts;
  }

  static async updateEmergencyContact(userId: string, contactId: string, input: EmergencyContactInput): Promise<IEmergencyContact[]> {
    const user = await User.findOne({ _id: userId, isSoftDeleted: false });
    if (!user) throw new NotFoundError('User not found');

    const contact = (user.emergencyContacts as any).id(contactId);
    if (!contact) throw new NotFoundError('Emergency contact not found');

    Object.assign(contact, input);
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'EMERGENCY_CONTACT_UPDATED',
      metadata: { contactId }
    });

    return user.emergencyContacts;
  }

  static async deleteEmergencyContact(userId: string, contactId: string): Promise<IEmergencyContact[]> {
    const user = await User.findOne({ _id: userId, isSoftDeleted: false });
    if (!user) throw new NotFoundError('User not found');

    (user.emergencyContacts as any).pull({ _id: contactId });
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'EMERGENCY_CONTACT_DELETED',
      metadata: { contactId }
    });

    return user.emergencyContacts;
  }

  static async softDeleteAccount(userId: string): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    user.isSoftDeleted = true;
    user.deletedAt = new Date();
    user.accountStatus = 'DELETED';
    await user.save();

    await RefreshToken.updateMany({ userId }, { isRevoked: true });
    await Session.deleteMany({ userId });

    await ActivityLog.create({
      userId: user._id,
      action: 'ACCOUNT_SOFT_DELETED'
    });

    return true;
  }
}
