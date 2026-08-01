import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User.model.js';
import { env } from '../config/env.config.js';
import { RegisterInput, LoginInput } from '../validators/auth.validator.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  static generateTokens(userId: string, role: string): TokenPair {
    const accessToken = jwt.sign(
      { userId, role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any }
    );

    const refreshToken = jwt.sign(
      { userId, role },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
    );

    return { accessToken, refreshToken };
  }

  static async register(input: RegisterInput): Promise<{ user: Partial<IUser>; tokens: TokenPair }> {
    const existingEmail = await User.findOne({ email: input.email });
    if (existingEmail) {
      throw new Error('Email is already registered');
    }

    const existingCallsign = await User.findOne({ callsign: input.callsign });
    if (existingCallsign) {
      throw new Error('Callsign is already taken');
    }

    const user = new User({
      email: input.email,
      passwordHash: input.password,
      phoneNumber: input.phoneNumber,
      callsign: input.callsign,
      fullName: input.fullName,
      role: 'RIDER',
      emergencyContacts: [],
      fcmTokens: []
    });

    await user.save();

    const tokens = this.generateTokens(user._id.toString(), user.role);

    const userResponse = {
      _id: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      callsign: user.callsign,
      fullName: user.fullName,
      role: user.role,
      emergencyContacts: user.emergencyContacts,
      createdAt: user.createdAt
    };

    return { user: userResponse as any, tokens };
  }

  static async login(input: LoginInput): Promise<{ user: Partial<IUser>; tokens: TokenPair }> {
    const user = await User.findOne({ email: input.email });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await user.comparePassword(input.password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const tokens = this.generateTokens(user._id.toString(), user.role);

    const userResponse = {
      _id: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      callsign: user.callsign,
      fullName: user.fullName,
      role: user.role,
      emergencyContacts: user.emergencyContacts,
      createdAt: user.createdAt
    };

    return { user: userResponse as any, tokens };
  }
}
