import request from 'supertest';
import { createApp } from '../../src/app.js';
import { SOSService } from '../../src/services/sos.service.js';
import { generateTestJwt } from '../helpers/testUtils.js';

describe('Enterprise SOS Emergency Response Engine Integration Tests', () => {
  const app = createApp();
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockSosId = '507f1f77bcf86cd799439099';
  const riderToken = generateTestJwt(mockUserId, 'RIDER');
  const adminToken = generateTestJwt(mockUserId, 'ADMIN');

  const mockSOSData = {
    _id: mockSosId,
    userId: mockUserId,
    status: 'COUNTDOWN',
    category: 'ACCIDENT',
    severity: 'HIGH',
    countdownSeconds: 10,
    escalationLevel: 1,
    location: { type: 'Point', coordinates: [72.8346, 18.922] },
    liveTrackpoints: [],
    timeline: [
      { event: 'COUNTDOWN_STARTED', description: 'SOS countdown initiated', timestamp: new Date().toISOString() }
    ],
    dispatchQueue: []
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('should initiate one-tap SOS countdown successfully', async () => {
    jest.spyOn(SOSService, 'startSOS').mockResolvedValue(mockSOSData as any);

    const res = await request(app)
      .post('/api/v1/sos/start')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        latitude: 18.922,
        longitude: 72.8346,
        category: 'ACCIDENT',
        severity: 'HIGH',
        countdownSeconds: 10
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('COUNTDOWN');
  });

  it('should cancel SOS countdown before trigger', async () => {
    jest.spyOn(SOSService, 'cancelSOS').mockResolvedValue({
      ...mockSOSData,
      status: 'CANCELLED'
    } as any);

    const res = await request(app)
      .post('/api/v1/sos/cancel')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        sosId: mockSosId,
        reason: 'Accidental button press'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  it('should trigger emergency SOS broadcast', async () => {
    jest.spyOn(SOSService, 'triggerSOS').mockResolvedValue({
      ...mockSOSData,
      status: 'TRACKING'
    } as any);

    const res = await request(app)
      .post('/api/v1/sos/trigger')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        sosId: mockSosId,
        manualNotes: 'Rider crash detected'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('TRACKING');
  });

  it('should stream live emergency GPS location update', async () => {
    jest.spyOn(SOSService, 'addLocation').mockResolvedValue({
      ...mockSOSData,
      location: { type: 'Point', coordinates: [72.838, 18.925] }
    } as any);

    const res = await request(app)
      .post('/api/v1/sos/location')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        sosId: mockSosId,
        latitude: 18.925,
        longitude: 72.838,
        speed: 35
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should mark SOS emergency resolved', async () => {
    jest.spyOn(SOSService, 'resolveSOS').mockResolvedValue({
      ...mockSOSData,
      status: 'RESOLVED'
    } as any);

    const res = await request(app)
      .post('/api/v1/sos/resolve')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        sosId: mockSosId,
        notes: 'Help arrived safely'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('RESOLVED');
  });

  it('should fetch current active SOS incident', async () => {
    jest.spyOn(SOSService, 'getCurrentActiveSOS').mockResolvedValue(mockSOSData as any);

    const res = await request(app)
      .get('/api/v1/sos/current')
      .set('Authorization', `Bearer ${riderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(mockSosId);
  });

  it('should fetch rider SOS history', async () => {
    jest.spyOn(SOSService, 'getSOSHistory').mockResolvedValue([mockSOSData as any]);

    const res = await request(app)
      .get('/api/v1/sos/history')
      .set('Authorization', `Bearer ${riderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it('should fetch SOS emergency timeline', async () => {
    jest.spyOn(SOSService, 'getSOSTimeline').mockResolvedValue({
      sosId: mockSosId,
      status: 'COUNTDOWN',
      timeline: mockSOSData.timeline
    });

    const res = await request(app)
      .get(`/api/v1/sos/${mockSosId}/timeline`)
      .set('Authorization', `Bearer ${riderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.timeline.length).toBe(1);
  });

  // --- ADMIN API TESTS ---

  it('should allow admin to fetch all emergency incidents system-wide', async () => {
    jest.spyOn(SOSService, 'getAllIncidentsAdmin').mockResolvedValue([mockSOSData as any]);

    const res = await request(app)
      .get('/api/v1/admin/sos')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it('should allow admin to force close an SOS incident', async () => {
    jest.spyOn(SOSService, 'adminForceClose').mockResolvedValue({
      ...mockSOSData,
      status: 'RESOLVED'
    } as any);

    const res = await request(app)
      .patch(`/api/v1/admin/sos/${mockSosId}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Admin verified rider safe' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('RESOLVED');
  });

  it('should allow admin to escalate an SOS incident', async () => {
    jest.spyOn(SOSService, 'adminEscalate').mockResolvedValue({
      ...mockSOSData,
      severity: 'CRITICAL',
      escalationLevel: 4
    } as any);

    const res = await request(app)
      .patch(`/api/v1/admin/sos/${mockSosId}/escalate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        newSeverity: 'CRITICAL',
        newEscalationLevel: 4,
        reason: 'Multiple emergency calls received'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.severity).toBe('CRITICAL');
  });
});
