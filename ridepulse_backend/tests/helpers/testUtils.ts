import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.config.js';

export const generateTestJwt = (userId: string = '507f1f77bcf86cd799439011', role: string = 'RIDER'): string => {
  return jwt.sign({ userId, role }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
};
