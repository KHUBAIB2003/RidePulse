import request from 'supertest';
import { createApp } from '../../src/app.js';
import { AuthService } from '../../src/services/auth.service.js';
import { ProfileService } from '../../src/services/profile.service.js';
import { generateTestJwt } from '../helpers/testUtils.js';

describe('Auth & Profile API Integration Tests', () => {
  const app = createApp();
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockTokens = {
    accessToken: generateTestJwt(mockUserId, 'RIDER'),
    refreshToken: 'mock_refresh_token_jwt'
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('should register a new rider account successfully', async () => {
    jest.spyOn(AuthService, 'register').mockResolvedValue({
      user: {
        _id: mockUserId as any,
        email: 'test@example.com',
        username: 'testrider',
        callsign: 'Apex1'
      },
      tokens: mockTokens
    });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'Rider',
        username: 'testrider',
        phoneNumber: '9876543210',
        callsign: 'Apex1'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data).toHaveProperty('tokens');
  });

  it('should authenticate user login and return JWT token pair', async () => {
    jest.spyOn(AuthService, 'login').mockResolvedValue({
      user: {
        _id: mockUserId as any,
        email: 'test@example.com'
      },
      tokens: mockTokens
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.tokens).toHaveProperty('refreshToken');
  });

  it('should fetch user profile with Bearer JWT token', async () => {
    jest.spyOn(ProfileService, 'getProfile').mockResolvedValue({
      _id: mockUserId as any,
      email: 'test@example.com',
      callsign: 'Apex1'
    });

    const res = await request(app)
      .get('/api/v1/profile')
      .set('Authorization', `Bearer ${mockTokens.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('test@example.com');
  });

  it('should update rider preferences successfully', async () => {
    jest.spyOn(ProfileService, 'updatePreferences').mockResolvedValue({
      _id: mockUserId as any,
      theme: 'DARK'
    });

    const res = await request(app)
      .put('/api/v1/profile/preferences')
      .set('Authorization', `Bearer ${mockTokens.accessToken}`)
      .send({
        theme: 'DARK'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.theme).toBe('DARK');
  });

  it('should add a new emergency contact', async () => {
    jest.spyOn(ProfileService, 'addEmergencyContact').mockResolvedValue([
      {
        name: 'Jane Doe',
        relationship: 'Spouse',
        phone: '9988776655',
        priority: 1,
        preferredContactMethod: 'CALL',
        isActive: true
      }
    ]);

    const res = await request(app)
      .post('/api/v1/profile/emergency-contacts')
      .set('Authorization', `Bearer ${mockTokens.accessToken}`)
      .send({
        name: 'Jane Doe',
        relationship: 'Spouse',
        phone: '9988776655',
        priority: 1,
        preferredContactMethod: 'CALL'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should rotate access & refresh tokens', async () => {
    jest.spyOn(AuthService, 'refreshToken').mockResolvedValue({
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token'
    });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: mockTokens.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });
});
