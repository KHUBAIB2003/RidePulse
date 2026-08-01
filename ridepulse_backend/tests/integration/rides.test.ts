import request from 'supertest';
import { createApp } from '../../src/app.js';
import { RideService } from '../../src/services/ride.service.js';
import { generateTestJwt } from '../helpers/testUtils.js';

describe('Enterprise Ride Tracking & Telemetry Engine Integration Tests', () => {
  const app = createApp();
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockBikeId = '507f1f77bcf86cd799439022';
  const mockRideId = '507f1f77bcf86cd799439033';
  const token = generateTestJwt(mockUserId, 'RIDER');

  const mockRideData = {
    _id: mockRideId,
    userId: mockUserId,
    bikeId: mockBikeId,
    title: 'Morning Coastal Sprint',
    status: 'RECORDING',
    startTime: new Date().toISOString(),
    distanceKm: 24.5,
    durationSeconds: 1800,
    avgSpeedKmh: 49.0,
    maxSpeedKmh: 95.0,
    waypoints: [
      {
        location: { type: 'Point', coordinates: [72.8346, 18.922] },
        altitude: 12.5,
        speedKmh: 45,
        bearing: 45,
        timestamp: new Date().toISOString(),
        provider: 'gps'
      }
    ],
    rideScore: 98
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('should start a new ride tracking session successfully', async () => {
    jest.spyOn(RideService, 'startRide').mockResolvedValue(mockRideData as any);

    const res = await request(app)
      .post('/api/v1/rides/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bikeId: mockBikeId,
        title: 'Morning Coastal Sprint',
        startLocation: {
          latitude: 18.922,
          longitude: 72.8346,
          altitude: 12.5
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('RECORDING');
  });

  it('should append a single GPS location waypoint to active ride', async () => {
    jest.spyOn(RideService, 'addLocation').mockResolvedValue({
      ...mockRideData,
      waypoints: [...mockRideData.waypoints, { location: { type: 'Point', coordinates: [72.838, 18.925] }, speedKmh: 50 }]
    } as any);

    const res = await request(app)
      .post('/api/v1/rides/location')
      .set('Authorization', `Bearer ${token}`)
      .send({
        rideId: mockRideId,
        latitude: 18.925,
        longitude: 72.838,
        speed: 50
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.waypoints.length).toBe(2);
  });

  it('should pause an active ride session', async () => {
    jest.spyOn(RideService, 'pauseRide').mockResolvedValue({
      ...mockRideData,
      status: 'PAUSED'
    } as any);

    const res = await request(app)
      .post('/api/v1/rides/pause')
      .set('Authorization', `Bearer ${token}`)
      .send({ rideId: mockRideId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PAUSED');
  });

  it('should resume a paused ride session', async () => {
    jest.spyOn(RideService, 'resumeRide').mockResolvedValue({
      ...mockRideData,
      status: 'RECORDING'
    } as any);

    const res = await request(app)
      .post('/api/v1/rides/resume')
      .set('Authorization', `Bearer ${token}`)
      .send({ rideId: mockRideId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('RECORDING');
  });

  it('should batch append GPS telemetry points', async () => {
    jest.spyOn(RideService, 'addBatchTelemetry').mockResolvedValue({
      ...mockRideData,
      waypoints: [
        ...mockRideData.waypoints,
        { location: { type: 'Point', coordinates: [72.84, 18.93] }, speedKmh: 65 }
      ]
    } as any);

    const res = await request(app)
      .post('/api/v1/rides/telemetry')
      .set('Authorization', `Bearer ${token}`)
      .send({
        rideId: mockRideId,
        points: [
          { latitude: 18.93, longitude: 72.84, speed: 65 }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should stop and finalize ride session', async () => {
    jest.spyOn(RideService, 'stopRide').mockResolvedValue({
      ...mockRideData,
      status: 'COMPLETED'
    } as any);

    const res = await request(app)
      .post('/api/v1/rides/stop')
      .set('Authorization', `Bearer ${token}`)
      .send({
        rideId: mockRideId,
        notes: 'Great smooth ride'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('COMPLETED');
  });

  it('should fetch list of rider recorded rides', async () => {
    jest.spyOn(RideService, 'getRides').mockResolvedValue({
      rides: [mockRideData as any],
      total: 1,
      page: 1,
      limit: 20
    });

    const res = await request(app)
      .get('/api/v1/rides')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it('should fetch ride replay keyframes dataset', async () => {
    jest.spyOn(RideService, 'getRideReplay').mockResolvedValue({
      rideId: mockRideId,
      title: 'Morning Coastal Sprint',
      totalPoints: 1,
      keyframes: [
        { step: 1, timeOffsetSec: 0, latitude: 18.922, longitude: 72.8346, speedKmh: 45 }
      ]
    });

    const res = await request(app)
      .get(`/api/v1/rides/${mockRideId}/replay`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.keyframes.length).toBe(1);
  });

  it('should export track in valid GPX XML format', async () => {
    jest.spyOn(RideService, 'exportGPX').mockResolvedValue(
      '<?xml version="1.0"?><gpx version="1.1"><trk><trkseg><trkpt lat="18.922" lon="72.8346"></trkpt></trkseg></trk></gpx>'
    );

    const res = await request(app)
      .get(`/api/v1/rides/${mockRideId}/export/gpx`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/gpx+xml');
    expect(res.text).toContain('<gpx');
  });

  it('should export track in valid GeoJSON format', async () => {
    jest.spyOn(RideService, 'exportGeoJSON').mockResolvedValue({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[72.8346, 18.922]] }, properties: {} }]
    });

    const res = await request(app)
      .get(`/api/v1/rides/${mockRideId}/export/geojson`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('FeatureCollection');
  });

  it('should export track in CSV format', async () => {
    jest.spyOn(RideService, 'exportCSV').mockResolvedValue(
      'latitude,longitude,altitude,speed_kmh\n18.922,72.8346,12.5,45\n'
    );

    const res = await request(app)
      .get(`/api/v1/rides/${mockRideId}/export/csv`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('latitude,longitude,altitude,speed_kmh');
  });

  it('should fetch rider aggregate statistics summary', async () => {
    jest.spyOn(RideService, 'getRideStatistics').mockResolvedValue({
      totalRides: 1,
      totalDistanceKm: 24.5,
      totalDurationSeconds: 1800,
      records: { longestRideKm: 24.5, fastestRideKmh: 95.0, highestElevationM: 120 }
    });

    const res = await request(app)
      .get('/api/v1/rides/statistics/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRides).toBe(1);
  });
});
