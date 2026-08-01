import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User.model.js';
import { RefreshToken } from '../models/RefreshToken.model.js';
import { Session } from '../models/Session.model.js';
import { ActivityLog } from '../models/ActivityLog.model.js';
import { env } from '../config/env.config.js';
import { 
  RegisterInput, 
  LoginInput, 
  ChangePasswordInput, 
  ForgotPasswordInput, 
  ResetPasswordInput 
} from '../validators/auth.validator.js';
import { 
  BadRequestError, 
  UnauthorizedError, 
  ForbiddenError, 
  NotFoundError 
} from '../errors/httpExceptions.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static generateTokens(userId: string, role: string): TokenPair {
    const accessToken = jwt.sign(
      { userId, role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any }
    );

    const refreshToken = jwt.sign(
      { userId, role, nonce: crypto.randomBytes(16).toString('hex') },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
    );

    return { accessToken, refreshToken };
  }

  static async register(input: RegisterInput, ipAddress = '', userAgent = ''): Promise<{ user: Partial<IUser>; tokens: TokenPair }> {
    const existingEmail = await User.findOne({ email: input.email.toLowerCase() });
    if (existingEmail) {
      throw new BadRequestError('Email address is already registered');
    }

    const existingUsername = await User.findOne({ username: input.username.toLowerCase() });
    if (existingUsername) {
      throw new BadRequestError('Username is already taken');
    }

    const existingCallsign = await User.findOne({ callsign: input.callsign });
    if (existingCallsign) {
      throw new BadRequestError('Callsign is already taken');
    }

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = new User({
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username.toLowerCase(),
      displayName: `${input.firstName} ${input.lastName}`,
      email: input.email.toLowerCase(),
      phoneNumber: input.phoneNumber,
      callsign: input.callsign,
      passwordHash: input.password,
      role: 'RIDER',
      accountStatus: 'ACTIVE',
      isEmailVerified: false,
      emailVerificationToken,
      emailVerificationTokenExpires,
      failedLoginAttempts: 0,
      passwordHistory: [],
      emergencyContacts: [],
      fcmTokens: [],
      isSoftDeleted: false
    });

    await user.save();

    // Add initial password to history
    user.passwordHistory.push(user.passwordHash);
    await user.save();

    const tokens = this.generateTokens(user._id.toString(), user.role);
    await this.storeRefreshToken(user._id.toString(), tokens.refreshToken, ipAddress, userAgent);

    // Audit Log
    await ActivityLog.create({
      userId: user._id,
      action: 'USER_REGISTERED',
      ipAddress,
      userAgent,
      metadata: { email: user.email, callsign: user.callsign }
    });

    const userResponse = this.sanitizeUser(user);
    return { user: userResponse, tokens };
  }

  static async login(input: LoginInput, ipAddress = '', userAgent = ''): Promise<{ user: Partial<IUser>; tokens: TokenPair }> {
    const user = await User.findOne({ email: input.email.toLowerCase(), isSoftDeleted: false });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Account Lock Protection Check
    if (user.isLocked()) {
      const remainingMinutes = Math.ceil((user.lockUntil!.getTime() - Date.now()) / 60000);
      throw new ForbiddenError(`Account is temporarily locked due to repeated failed logins. Try again in ${remainingMinutes} minute(s).`);
    }

    const isMatch = await user.comparePassword(input.password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
        user.accountStatus = 'LOCKED';
      }
      await user.save();

      await ActivityLog.create({
        userId: user._id,
        action: 'FAILED_LOGIN_ATTEMPT',
        ipAddress,
        userAgent,
        metadata: { failedAttempts: user.failedLoginAttempts }
      });

      throw new UnauthorizedError('Invalid email or password');
    }

    // Reset lock counters on successful authentication
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.accountStatus = 'ACTIVE';
    user.lastLogin = new Date();
    user.isOnline = true;
    await user.save();

    const tokens = this.generateTokens(user._id.toString(), user.role);
    await this.storeRefreshToken(user._id.toString(), tokens.refreshToken, ipAddress, userAgent, input.deviceId);

    // Update Session
    const sessionId = crypto.randomUUID();
    await Session.create({
      userId: user._id,
      sessionId,
      deviceName: input.deviceName || 'Mobile App',
      ipAddress,
      userAgent,
      lastActive: new Date()
    });

    await ActivityLog.create({
      userId: user._id,
      action: 'USER_LOGIN_SUCCESS',
      ipAddress,
      userAgent
    });

    return { user: this.sanitizeUser(user), tokens };
  }

  static async refreshToken(refreshTokenString: string, ipAddress = '', userAgent = ''): Promise<TokenPair> {
    try {
      const decoded = jwt.verify(refreshTokenString, env.JWT_REFRESH_SECRET) as { userId: string; role: string };
      const tokenHash = this.hashToken(refreshTokenString);

      const existingToken = await RefreshToken.findOne({ tokenHash });

      // Reuse Detection Security Guard: If a revoked token is presented, revoke all user tokens immediately!
      if (!existingToken || existingToken.isRevoked) {
        if (existingToken) {
          await RefreshToken.updateMany({ userId: existingToken.userId }, { isRevoked: true });
          await ActivityLog.create({
            userId: existingToken.userId,
            action: 'SECURITY_TOKEN_REUSE_DETECTED',
            ipAddress,
            userAgent
          });
        }
        throw new UnauthorizedError('Invalid or revoked refresh token');
      }

      // Mark old token as revoked/replaced
      existingToken.isRevoked = true;
      const newTokens = this.generateTokens(decoded.userId, decoded.role);
      existingToken.replacedByTokenHash = this.hashToken(newTokens.refreshToken);
      await existingToken.save();

      // Store new refresh token
      await this.storeRefreshToken(decoded.userId, newTokens.refreshToken, ipAddress, userAgent);

      await ActivityLog.create({
        userId: decoded.userId,
        action: 'REFRESH_TOKEN_ROTATED',
        ipAddress,
        userAgent
      });

      return newTokens;
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  static async logout(refreshTokenString: string, userId: string): Promise<boolean> {
    const tokenHash = this.hashToken(refreshTokenString);
    await RefreshToken.updateOne({ tokenHash, userId }, { isRevoked: true });
    await User.updateOne({ _id: userId }, { isOnline: false, lastSeen: new Date() });
    
    await ActivityLog.create({
      userId,
      action: 'USER_LOGOUT'
    });

    return true;
  }

  static async logoutAllDevices(userId: string): Promise<boolean> {
    await RefreshToken.updateMany({ userId }, { isRevoked: true });
    await Session.deleteMany({ userId });
    await User.updateOne({ _id: userId }, { isOnline: false, lastSeen: new Date() });

    await ActivityLog.create({
      userId,
      action: 'LOGOUT_ALL_DEVICES'
    });

    return true;
  }

  static async changePassword(userId: string, input: ChangePasswordInput): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const isMatch = await user.comparePassword(input.currentPassword);
    if (!isMatch) {
      throw new BadRequestError('Current password does not match');
    }

    // Password History reuse check (prevent reusing last 3 passwords)
    for (const oldHash of user.passwordHistory.slice(-3)) {
      const isReused = await import('bcrypt').then(b => b.compare(input.newPassword, oldHash));
      if (isReused) {
        throw new BadRequestError('Cannot reuse a recently used password. Choose a new password.');
      }
    }

    user.passwordHash = input.newPassword;
    await user.save();

    user.passwordHistory.push(user.passwordHash);
    if (user.passwordHistory.length > 5) user.passwordHistory.shift();
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'PASSWORD_CHANGED'
    });

    return true;
  }

  static async forgotPassword(input: ForgotPasswordInput): Promise<boolean> {
    const user = await User.findOne({ email: input.email.toLowerCase(), isSoftDeleted: false });
    if (!user) return true; // Silent return for privacy

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'FORGOT_PASSWORD_REQUESTED'
    });

    console.log(`[EmailService] Password reset token generated for ${user.email}: ${resetToken}`);
    return true;
  }

  static async resetPassword(input: ResetPasswordInput): Promise<boolean> {
    const hashedToken = crypto.createHash('sha256').update(input.token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetTokenExpires: { $gt: new Date() },
      isSoftDeleted: false
    });

    if (!user) {
      throw new BadRequestError('Password reset token is invalid or has expired');
    }

    user.passwordHash = input.newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.accountStatus = 'ACTIVE';
    await user.save();

    user.passwordHistory.push(user.passwordHash);
    await user.save();

    // Revoke tokens on password reset
    await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true });

    await ActivityLog.create({
      userId: user._id,
      action: 'PASSWORD_RESET_SUCCESS'
    });

    return true;
  }

  static async verifyEmail(token: string): Promise<boolean> {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new BadRequestError('Verification token is invalid or has expired');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'EMAIL_VERIFIED'
    });

    return true;
  }

  private static async storeRefreshToken(
    userId: string, 
    tokenString: string, 
    ipAddress = '', 
    userAgent = '', 
    deviceId = 'default'
  ): Promise<void> {
    const tokenHash = this.hashToken(tokenString);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await RefreshToken.create({
      userId,
      tokenHash,
      deviceId,
      ipAddress,
      userAgent,
      expiresAt,
      isRevoked: false
    });
  }

  private static sanitizeUser(user: IUser): Partial<IUser> {
    const obj = user.toObject();
    delete (obj as any).passwordHash;
    delete (obj as any).passwordHistory;
    delete (obj as any).emailVerificationToken;
    delete (obj as any).passwordResetToken;
    return obj;
  }
}
