import request from 'supertest';
import { createApp } from '../../src/app.js';
import { GuardianService } from '../../src/services/guardian.service.js';
import { generateTestJwt } from '../helpers/testUtils.js';

describe('Guardian Safety Check-In Engine — Integration Tests', () => {
  const app = createApp();

  // ── Mock IDs ──────────────────────────────────────────────
  const riderUserId    = '507f1f77bcf86cd799439011';
  const guardianUserId = '507f1f77bcf86cd799439022';
  const guardianId     = '507f1f77bcf86cd799439033';
  const invitationId   = '507f1f77bcf86cd799439044';
  const sessionId      = '507f1f77bcf86cd799439055';

  // ── Tokens ────────────────────────────────────────────────
  const riderToken    = generateTestJwt(riderUserId,    'RIDER');
  const guardianToken = generateTestJwt(guardianUserId, 'RIDER');

  // ── Mock Fixtures ─────────────────────────────────────────
  const mockInvitation = {
    _id:               invitationId,
    riderId:           riderUserId,
    riderDisplayName:  'Test Rider',
    riderCallsign:     'RIDER_ONE',
    inviteeUserId:     guardianUserId,
    inviteeDisplayName: 'Guardian User',
    inviteeCallsign:   'HAWK_G1',
    label:             'Primary Guardian',
    priority:          1,
    requestedPermissions: ['VIEW_LOCATION', 'RECEIVE_CHECKIN_ALERTS', 'RECEIVE_SOS_ALERTS'],
    status:            'PENDING',
    token:             'abc123token',
    tokenExpiresAt:    new Date(Date.now() + 72 * 3_600_000)
  };

  const mockGuardian = {
    _id:                guardianId,
    riderId:            riderUserId,
    guardianUserId:     guardianUserId,
    guardianDisplayName: 'Guardian User',
    guardianCallsign:   'HAWK_G1',
    guardianPhone:      '+919999999999',
    label:              'Primary Guardian',
    priority:           1,
    permissions:        ['VIEW_LOCATION', 'RECEIVE_CHECKIN_ALERTS', 'RECEIVE_SOS_ALERTS'],
    isActive:           true,
    totalSessionsMonitored: 0,
    totalCheckInAlerts: 0,
    acceptedAt:         new Date()
  };

  const mockSession = {
    _id:             sessionId,
    riderId:         riderUserId,
    guardianId:      guardianId,
    guardianUserId:  guardianUserId,
    title:           'Guardian Safety Session',
    intervalMinutes: 30,
    gracePeriodMinutes: 5,
    windows:         [],
    totalWindows:    1,
    completedWindows: 0,
    missedWindows:   0,
    escalationStage: 0,
    status:          'ACTIVE',
    startedAt:       new Date()
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // INVITATION TESTS
  // ═══════════════════════════════════════════════════════════
  describe('POST /api/v1/guardian/invite', () => {
    it('should send a guardian invitation successfully', async () => {
      jest.spyOn(GuardianService, 'sendInvitation').mockResolvedValue(mockInvitation as any);

      const res = await request(app)
        .post('/api/v1/guardian/invite')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          inviteeCallsign: 'HAWK_G1',
          label: 'Primary Guardian',
          priority: 1,
          permissions: ['VIEW_LOCATION', 'RECEIVE_CHECKIN_ALERTS', 'RECEIVE_SOS_ALERTS']
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.inviteeCallsign).toBe('HAWK_G1');
    });

    it('should reject invitation without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/guardian/invite')
        .send({ inviteeCallsign: 'HAWK_G1' });

      expect(res.status).toBe(401);
    });

    it('should reject invitation with missing callsign', async () => {
      const res = await request(app)
        .post('/api/v1/guardian/invite')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  describe('POST /api/v1/guardian/accept', () => {
    it('should accept a guardian invitation', async () => {
      jest.spyOn(GuardianService, 'acceptInvitation').mockResolvedValue(mockGuardian as any);

      const res = await request(app)
        .post('/api/v1/guardian/accept')
        .set('Authorization', `Bearer ${guardianToken}`)
        .send({ invitationId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(true);
    });

    it('should reject acceptance without auth', async () => {
      const res = await request(app)
        .post('/api/v1/guardian/accept')
        .send({ invitationId });

      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════
  describe('POST /api/v1/guardian/reject', () => {
    it('should reject a guardian invitation', async () => {
      jest.spyOn(GuardianService, 'rejectInvitation').mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/v1/guardian/reject')
        .set('Authorization', `Bearer ${guardianToken}`)
        .send({ invitationId, reason: 'Not available' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GUARDIAN MANAGEMENT TESTS
  // ═══════════════════════════════════════════════════════════
  describe('GET /api/v1/guardian', () => {
    it('should return list of rider guardians', async () => {
      jest.spyOn(GuardianService, 'getMyGuardians').mockResolvedValue([mockGuardian] as any);

      const res = await request(app)
        .get('/api/v1/guardian')
        .set('Authorization', `Bearer ${riderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].guardianCallsign).toBe('HAWK_G1');
    });
  });

  describe('GET /api/v1/guardian/monitoring', () => {
    it('should return list of riders being monitored', async () => {
      jest.spyOn(GuardianService, 'getRidersIGuard').mockResolvedValue([mockGuardian] as any);

      const res = await request(app)
        .get('/api/v1/guardian/monitoring')
        .set('Authorization', `Bearer ${guardianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PATCH /api/v1/guardian/:id', () => {
    it('should update guardian priority and label', async () => {
      const updated = { ...mockGuardian, label: 'Trusted Buddy', priority: 2 };
      jest.spyOn(GuardianService, 'updateGuardian').mockResolvedValue(updated as any);

      const res = await request(app)
        .patch(`/api/v1/guardian/${guardianId}`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({ label: 'Trusted Buddy', priority: 2 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.label).toBe('Trusted Buddy');
    });
  });

  describe('DELETE /api/v1/guardian/:id', () => {
    it('should remove a guardian', async () => {
      jest.spyOn(GuardianService, 'removeGuardian').mockResolvedValue(undefined);

      const res = await request(app)
        .delete(`/api/v1/guardian/${guardianId}`)
        .set('Authorization', `Bearer ${riderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // SESSION TESTS
  // ═══════════════════════════════════════════════════════════
  describe('POST /api/v1/guardian/start', () => {
    it('should start a guardian monitoring session', async () => {
      jest.spyOn(GuardianService, 'startSession').mockResolvedValue(mockSession as any);

      const res = await request(app)
        .post('/api/v1/guardian/start')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          guardianId,
          intervalMinutes: 30,
          gracePeriodMinutes: 5,
          latitude: 18.922,
          longitude: 72.8346
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.intervalMinutes).toBe(30);
    });

    it('should reject with invalid guardianId', async () => {
      const res = await request(app)
        .post('/api/v1/guardian/start')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({ guardianId: 'invalid' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/guardian/checkin', () => {
    it('should acknowledge a check-in window', async () => {
      const acknowledgedSession = {
        ...mockSession,
        completedWindows: 1,
        escalationStage: 0
      };
      jest.spyOn(GuardianService, 'acknowledgeCheckIn').mockResolvedValue(acknowledgedSession as any);

      const res = await request(app)
        .post('/api/v1/guardian/checkin')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          sessionId,
          latitude: 18.922,
          longitude: 72.8346,
          note: 'All good!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.completedWindows).toBe(1);
    });
  });

  describe('POST /api/v1/guardian/end', () => {
    it('should end a monitoring session', async () => {
      const endedSession = { ...mockSession, status: 'COMPLETED', endedAt: new Date(), endedBy: 'RIDER' };
      jest.spyOn(GuardianService, 'endSession').mockResolvedValue(endedSession as any);

      const res = await request(app)
        .post('/api/v1/guardian/end')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({ sessionId, reason: 'Ride completed safely' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // QUERY TESTS
  // ═══════════════════════════════════════════════════════════
  describe('GET /api/v1/guardian/session/active', () => {
    it('should return active session', async () => {
      jest.spyOn(GuardianService, 'getActiveSession').mockResolvedValue(mockSession as any);

      const res = await request(app)
        .get('/api/v1/guardian/session/active')
        .set('Authorization', `Bearer ${riderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACTIVE');
    });

    it('should return null when no active session', async () => {
      jest.spyOn(GuardianService, 'getActiveSession').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/guardian/session/active')
        .set('Authorization', `Bearer ${riderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });

  describe('GET /api/v1/guardian/history', () => {
    it('should return session history', async () => {
      jest.spyOn(GuardianService, 'getSessionHistory').mockResolvedValue([mockSession] as any);

      const res = await request(app)
        .get('/api/v1/guardian/history')
        .set('Authorization', `Bearer ${riderToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/guardian/analytics', () => {
    it('should return guardian analytics', async () => {
      jest.spyOn(GuardianService, 'getAnalytics').mockResolvedValue({
        totalGuardians: 2,
        activeSessions: 1,
        totalSessions: 5,
        completedCheckIns: 18,
        missedCheckIns: 2,
        checkInCompletionRate: '90.0'
      });

      const res = await request(app)
        .get('/api/v1/guardian/analytics')
        .set('Authorization', `Bearer ${riderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalGuardians).toBe(2);
      expect(res.body.data.checkInCompletionRate).toBe('90.0');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // AUTHORIZATION TESTS
  // ═══════════════════════════════════════════════════════════
  describe('Authorization Guard', () => {
    const protectedEndpoints = [
      { method: 'get',    path: '/api/v1/guardian' },
      { method: 'post',   path: '/api/v1/guardian/invite' },
      { method: 'post',   path: '/api/v1/guardian/start' },
      { method: 'post',   path: '/api/v1/guardian/checkin' },
      { method: 'post',   path: '/api/v1/guardian/end' },
      { method: 'get',    path: '/api/v1/guardian/history' },
      { method: 'get',    path: '/api/v1/guardian/analytics' },
    ];

    protectedEndpoints.forEach(({ method, path }) => {
      it(`${method.toUpperCase()} ${path} should return 401 without token`, async () => {
        const res = await (request(app) as any)[method](path);
        expect(res.status).toBe(401);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // VALIDATOR TESTS
  // ═══════════════════════════════════════════════════════════
  describe('Zod Validation Gate', () => {
    it('should reject intervalMinutes below minimum (5)', async () => {
      const res = await request(app)
        .post('/api/v1/guardian/start')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({ guardianId, intervalMinutes: 2 });

      expect(res.status).toBe(400);
    });

    it('should reject gracePeriodMinutes above maximum (30)', async () => {
      const res = await request(app)
        .post('/api/v1/guardian/start')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({ guardianId, intervalMinutes: 30, gracePeriodMinutes: 99 });

      expect(res.status).toBe(400);
    });

    it('should reject invalid permission in invite', async () => {
      const res = await request(app)
        .post('/api/v1/guardian/invite')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          inviteeCallsign: 'HAWK_G1',
          permissions: ['INVALID_PERMISSION']
        });

      expect(res.status).toBe(400);
    });
  });
});
