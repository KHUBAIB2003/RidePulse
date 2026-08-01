import request from 'supertest';
import { createApp } from '../../src/app.js';
import { EmergencyContactService } from '../../src/services/emergency-contact.service.js';
import { generateTestJwt } from '../helpers/testUtils.js';

describe('Emergency Contact Intelligence Engine — Integration Tests', () => {
  const app = createApp();

  // ── Mock IDs ──────────────────────────────────────────────
  const ownerUserId   = '507f1f77bcf86cd799439011';
  const inviteeUserId = '507f1f77bcf86cd799439022';
  const contactId     = '507f1f77bcf86cd799439033';
  const invitationId  = '507f1f77bcf86cd799439044';

  // ── Tokens ────────────────────────────────────────────────
  const ownerToken   = generateTestJwt(ownerUserId,   'RIDER');
  const inviteeToken = generateTestJwt(inviteeUserId, 'RIDER');

  // ── Mock Fixtures ─────────────────────────────────────────
  const mockContact = {
    _id:                  contactId,
    ownerId:              ownerUserId,
    name:                 'Priya Sharma',
    relationship:         'SPOUSE',
    phone:                '9876543210',
    countryCode:          '+91',
    email:                'priya@example.com',
    priority:             1,
    isPrimary:            true,
    isFavourite:          true,
    availabilityStatus:   'AVAILABLE',
    verificationStatus:   'VERIFIED',
    isActive:             true,
    totalAlertsSent:      3,
    totalAlertsDelivered: 3,
    totalAlertsFailed:    0,
    channelPreferences:   [
      { channel: 'SMS', enabled: true },
      { channel: 'CALL', enabled: true },
      { channel: 'WHATSAPP', enabled: false }
    ],
    isSoftDeleted: false,
    createdAt:     new Date()
  };

  const mockInvitation = {
    _id:                invitationId,
    ownerId:            ownerUserId,
    ownerDisplayName:   'Test Owner',
    ownerCallsign:      'RIDER_X',
    contactName:        'Priya Sharma',
    contactPhone:       '9876543210',
    emergencyContactId: contactId,
    relationship:       'SPOUSE',
    requestedChannels:  ['SMS', 'CALL'],
    status:             'PENDING',
    token:              'abc123tokenvalue',
    tokenExpiresAt:     new Date(Date.now() + 48 * 3_600_000)
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // CREATE CONTACT
  // ═══════════════════════════════════════════════════════════
  describe('POST /api/v1/emergency-contacts', () => {
    it('should create a new emergency contact', async () => {
      jest.spyOn(EmergencyContactService, 'createContact').mockResolvedValue(mockContact as any);

      const res = await request(app)
        .post('/api/v1/emergency-contacts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name:         'Priya Sharma',
          relationship: 'SPOUSE',
          phone:        '9876543210',
          countryCode:  '+91',
          email:        'priya@example.com',
          priority:     1,
          isPrimary:    true,
          isFavourite:  true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Priya Sharma');
      expect(res.body.data.isPrimary).toBe(true);
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/emergency-contacts')
        .send({ name: 'Test', phone: '9876543210' });

      expect(res.status).toBe(401);
    });

    it('should reject with missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/emergency-contacts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ relationship: 'SPOUSE' });

      expect(res.status).toBe(400);
    });

    it('should reject phone shorter than 7 characters', async () => {
      const res = await request(app)
        .post('/api/v1/emergency-contacts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Test', phone: '123' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid relationship enum', async () => {
      const res = await request(app)
        .post('/api/v1/emergency-contacts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Test', phone: '9876543210', relationship: 'ALIEN' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid avatarColor format', async () => {
      const res = await request(app)
        .post('/api/v1/emergency-contacts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Test', phone: '9876543210', avatarColor: 'notacolor' });

      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // LIST CONTACTS
  // ═══════════════════════════════════════════════════════════
  describe('GET /api/v1/emergency-contacts', () => {
    it('should return priority-ordered contact list', async () => {
      jest.spyOn(EmergencyContactService, 'listContacts').mockResolvedValue([mockContact] as any);

      const res = await request(app)
        .get('/api/v1/emergency-contacts')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].isPrimary).toBe(true);
      expect(res.body.count).toBe(1);
    });

    it('should accept valid query filters', async () => {
      jest.spyOn(EmergencyContactService, 'listContacts').mockResolvedValue([mockContact] as any);

      const res = await request(app)
        .get('/api/v1/emergency-contacts?isActive=true&isPrimary=true&limit=10')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/emergency-contacts');
      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET SINGLE CONTACT
  // ═══════════════════════════════════════════════════════════
  describe('GET /api/v1/emergency-contacts/:id', () => {
    it('should return a single contact', async () => {
      jest.spyOn(EmergencyContactService, 'getContactById').mockResolvedValue(mockContact as any);

      const res = await request(app)
        .get(`/api/v1/emergency-contacts/${contactId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(contactId);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // UPDATE CONTACT
  // ═══════════════════════════════════════════════════════════
  describe('PUT /api/v1/emergency-contacts/:id', () => {
    it('should update contact details', async () => {
      const updated = { ...mockContact, name: 'Priya Kapoor', priority: 2 };
      jest.spyOn(EmergencyContactService, 'updateContact').mockResolvedValue(updated as any);

      const res = await request(app)
        .put(`/api/v1/emergency-contacts/${contactId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Priya Kapoor', priority: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Priya Kapoor');
      expect(res.body.data.priority).toBe(2);
    });

    it('should reject priority above 20', async () => {
      const res = await request(app)
        .put(`/api/v1/emergency-contacts/${contactId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ priority: 99 });

      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE CONTACT
  // ═══════════════════════════════════════════════════════════
  describe('DELETE /api/v1/emergency-contacts/:id', () => {
    it('should soft-delete a contact', async () => {
      jest.spyOn(EmergencyContactService, 'deleteContact').mockResolvedValue(undefined);

      const res = await request(app)
        .delete(`/api/v1/emergency-contacts/${contactId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PRIMARY CONTACT
  // ═══════════════════════════════════════════════════════════
  describe('PATCH /api/v1/emergency-contacts/:id/primary', () => {
    it('should set a contact as primary', async () => {
      jest.spyOn(EmergencyContactService, 'setPrimaryContact').mockResolvedValue(mockContact as any);

      const res = await request(app)
        .patch(`/api/v1/emergency-contacts/${contactId}/primary`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isPrimary).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // INVITATIONS
  // ═══════════════════════════════════════════════════════════
  describe('POST /api/v1/emergency-contacts/invite', () => {
    it('should send an invitation successfully', async () => {
      jest.spyOn(EmergencyContactService, 'sendInvite').mockResolvedValue(mockInvitation as any);

      const res = await request(app)
        .post('/api/v1/emergency-contacts/invite')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          emergencyContactId: contactId,
          message: 'Please be my emergency contact!'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PENDING');
    });

    it('should reject without emergencyContactId', async () => {
      const res = await request(app)
        .post('/api/v1/emergency-contacts/invite')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ message: 'Hello' });

      expect(res.status).toBe(400);
    });

    it('should reject with invalid contactId length', async () => {
      const res = await request(app)
        .post('/api/v1/emergency-contacts/invite')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ emergencyContactId: 'tooshort' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/emergency-contacts/accept', () => {
    it('should accept an invitation', async () => {
      jest.spyOn(EmergencyContactService, 'acceptInvite').mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/v1/emergency-contacts/accept')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .send({ invitationId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/emergency-contacts/reject', () => {
    it('should reject an invitation', async () => {
      jest.spyOn(EmergencyContactService, 'rejectInvite').mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/v1/emergency-contacts/reject')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .send({ invitationId, reason: 'Not available' });

      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // ANALYTICS & HISTORY
  // ═══════════════════════════════════════════════════════════
  describe('GET /api/v1/emergency-contacts/activity', () => {
    it('should return activity history', async () => {
      jest.spyOn(EmergencyContactService, 'getActivityHistory').mockResolvedValue([
        {
          _id:                'act1',
          ownerId:            ownerUserId,
          emergencyContactId: contactId,
          activityType:       'CONTACT_CREATED',
          description:        'Contact created',
          performedBy:        'USER',
          createdAt:          new Date()
        }
      ] as any);

      const res = await request(app)
        .get('/api/v1/emergency-contacts/activity')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/emergency-contacts/analytics', () => {
    it('should return analytics data', async () => {
      jest.spyOn(EmergencyContactService, 'getAnalytics').mockResolvedValue({
        total:          3,
        active:         3,
        verified:       2,
        unverified:     1,
        hasPrimary:     true,
        favouriteCount: 1,
        slotsRemaining: 7,
        alertStats: {
          sent:        10,
          delivered:   9,
          failed:      1,
          successRate: '90.0%'
        }
      });

      const res = await request(app)
        .get('/api/v1/emergency-contacts/analytics')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.hasPrimary).toBe(true);
      expect(res.body.data.alertStats.successRate).toBe('90.0%');
    });
  });

  describe('GET /api/v1/emergency-contacts/invitations/pending', () => {
    it('should return pending invitations', async () => {
      jest.spyOn(EmergencyContactService, 'getPendingInvitations').mockResolvedValue([mockInvitation] as any);

      const res = await request(app)
        .get('/api/v1/emergency-contacts/invitations/pending')
        .set('Authorization', `Bearer ${inviteeToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/emergency-contacts/:id/notifications', () => {
    it('should return notification history for a contact', async () => {
      jest.spyOn(EmergencyContactService, 'getContactNotifications').mockResolvedValue([] as any);

      const res = await request(app)
        .get(`/api/v1/emergency-contacts/${contactId}/notifications`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // AUTHORIZATION GUARD
  // ═══════════════════════════════════════════════════════════
  describe('Authorization Guard', () => {
    const protectedEndpoints = [
      { method: 'get',    path: '/api/v1/emergency-contacts' },
      { method: 'post',   path: '/api/v1/emergency-contacts' },
      { method: 'get',    path: '/api/v1/emergency-contacts/activity' },
      { method: 'get',    path: '/api/v1/emergency-contacts/analytics' },
      { method: 'post',   path: '/api/v1/emergency-contacts/invite' },
      { method: 'post',   path: '/api/v1/emergency-contacts/accept' },
      { method: 'post',   path: '/api/v1/emergency-contacts/reject' },
    ];

    protectedEndpoints.forEach(({ method, path }) => {
      it(`${method.toUpperCase()} ${path} → 401 without token`, async () => {
        const res = await (request(app) as any)[method](path);
        expect(res.status).toBe(401);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // ZOD VALIDATION GATE
  // ═══════════════════════════════════════════════════════════
  describe('Zod Validation Gate', () => {
    it('should reject priority below 1', async () => {
      const res = await request(app)
        .post('/api/v1/emergency-contacts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Test', phone: '9876543210', priority: 0 });

      expect(res.status).toBe(400);
    });

    it('should reject name longer than 100 chars', async () => {
      const res = await request(app)
        .post('/api/v1/emergency-contacts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'A'.repeat(101), phone: '9876543210' });

      expect(res.status).toBe(400);
    });

    it('should reject notes longer than 500 chars', async () => {
      const res = await request(app)
        .post('/api/v1/emergency-contacts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Test', phone: '9876543210', notes: 'X'.repeat(501) });

      expect(res.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/emergency-contacts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Test', phone: '9876543210', email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('should reject reject invitation without invitationId', async () => {
      const res = await request(app)
        .post('/api/v1/emergency-contacts/reject')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'No thanks' });

      expect(res.status).toBe(400);
    });

    it('should reject invite message longer than 500 chars', async () => {
      const res = await request(app)
        .post('/api/v1/emergency-contacts/invite')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ emergencyContactId: contactId, message: 'M'.repeat(501) });

      expect(res.status).toBe(400);
    });
  });
});
