import request from 'supertest';
import { createApp } from '../../src/app.js';
import { GarageService } from '../../src/services/garage.service.js';
import { generateTestJwt } from '../helpers/testUtils.js';

describe('Digital Garage API Integration Tests', () => {
  const app = createApp();
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockBikeId = '507f1f77bcf86cd799439022';
  const token = generateTestJwt(mockUserId, 'RIDER');

  const testBike = {
    make: 'Ducati',
    bikeModel: 'Panigale V4 S',
    year: 2024,
    engineCc: 1103,
    odometerKm: 2500,
    fuelCapacityLiters: 16,
    isDefault: true
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('should add a new motorcycle to the Digital Garage', async () => {
    jest.spyOn(GarageService, 'createBike').mockResolvedValue({
      _id: mockBikeId as any,
      userId: mockUserId as any,
      ...testBike,
      currentMileageKm: 2500,
      averageMileageKmpl: 15.5,
      status: 'ACTIVE',
      isArchived: false,
      isSoftDeleted: false,
      calculateHealthScore: () => 100
    } as any);

    const res = await request(app)
      .post('/api/v1/bikes')
      .set('Authorization', `Bearer ${token}`)
      .send(testBike);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.make).toBe('Ducati');
    expect(res.body.data.bikeModel).toBe('Panigale V4 S');
  });

  it('should fetch all motorcycles in rider garage', async () => {
    jest.spyOn(GarageService, 'getUserBikes').mockResolvedValue([
      {
        _id: mockBikeId as any,
        make: 'Ducati',
        bikeModel: 'Panigale V4 S',
        isDefault: true
      } as any
    ]);

    const res = await request(app)
      .get('/api/v1/bikes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].make).toBe('Ducati');
  });

  it('should set motorcycle as default vehicle', async () => {
    jest.spyOn(GarageService, 'setDefaultBike').mockResolvedValue({
      _id: mockBikeId as any,
      isDefault: true
    } as any);

    const res = await request(app)
      .patch(`/api/v1/bikes/${mockBikeId}/default`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isDefault).toBe(true);
  });

  it('should log a maintenance service record', async () => {
    jest.spyOn(GarageService, 'addMaintenanceLog').mockResolvedValue({
      _id: '507f1f77bcf86cd799439033' as any,
      bikeId: mockBikeId as any,
      title: 'Full Engine Service & Oil Change',
      category: 'OIL_CHANGE',
      cost: 4500,
      odometerAtServiceKm: 2500,
      status: 'COMPLETED'
    } as any);

    const res = await request(app)
      .post(`/api/v1/bikes/${mockBikeId}/maintenance`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Full Engine Service & Oil Change',
        category: 'OIL_CHANGE',
        cost: 4500,
        odometerAtServiceKm: 2500
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.category).toBe('OIL_CHANGE');
  });

  it('should log fuel fill and calculate fuel economy', async () => {
    jest.spyOn(GarageService, 'addFuelLog').mockResolvedValue({
      _id: '507f1f77bcf86cd799439044' as any,
      bikeId: mockBikeId as any,
      fuelLiters: 14,
      totalCost: 1400,
      pricePerLiter: 100,
      odometerKm: 2750,
      distanceSinceLastFillKm: 250,
      calculatedKmpl: 17.86
    } as any);

    const res = await request(app)
      .post(`/api/v1/bikes/${mockBikeId}/fuel`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        fuelLiters: 14,
        totalCost: 1400,
        odometerKm: 2750,
        fuelStationName: 'Shell Select'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.calculatedKmpl).toBe(17.86);
  });

  it('should fetch garage statistics summary', async () => {
    jest.spyOn(GarageService, 'getGarageStatistics').mockResolvedValue({
      totalBikes: 2,
      totalMileageKm: 8500,
      totalExpenseCost: 15400,
      avgHealthScore: 95
    });

    const res = await request(app)
      .get('/api/v1/bikes/statistics')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalBikes).toBe(2);
    expect(res.body.data.avgHealthScore).toBe(95);
  });
});
