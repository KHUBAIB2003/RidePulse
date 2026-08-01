import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('GET /health API Integration Tests', () => {
  const app = createApp();

  it('should return 200/503 status code with service telemetry metadata', async () => {
    const res = await request(app).get('/health');
    
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('service', 'RidePulse Backend API Engine');
    expect(res.body).toHaveProperty('environment');
    expect(res.body).toHaveProperty('database');
    expect(res.body.database).toHaveProperty('status');
  });

  it('should return 404 for unknown endpoints', async () => {
    const res = await request(app).get('/api/v1/non-existent-route');
    
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});
