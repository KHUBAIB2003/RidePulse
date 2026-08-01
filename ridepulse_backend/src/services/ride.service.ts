import { RideLog, IRideLog, IWaypoint } from '../models/RideLog.model.js';
import { Bike } from '../models/Bike.model.js';
import { SocketManager } from '../sockets/socket.manager.js';
import { 
  StartRideInput, 
  PauseRideInput, 
  ResumeRideInput, 
  StopRideInput, 
  AddLocationInput, 
  BatchTelemetryInput,
  QueryRidesInput 
} from '../validators/ride.validator.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../errors/httpExceptions.js';

export class RideService {
  /**
   * Calculate Haversine distance between two sets of GPS coordinates in meters
   */
  private static calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  /**
   * Start a new ride session
   */
  static async startRide(userId: string, input: StartRideInput): Promise<IRideLog> {
    const bike = await Bike.findOne({ _id: input.bikeId, isSoftDeleted: false });
    if (!bike) {
      throw new NotFoundError('Motorcycle not found in garage');
    }
    if (bike.userId.toString() !== userId) {
      throw new ForbiddenError('Access denied: Motorcycle belongs to another rider');
    }

    const activeRide = await RideLog.findOne({
      userId,
      status: { $in: ['RECORDING', 'PAUSED'] },
      isSoftDeleted: false
    });

    if (activeRide) {
      throw new BadRequestError(`Rider already has an active ride in progress (ID: ${activeRide._id})`);
    }

    const title = input.title || `${bike.make} ${bike.bikeModel} Ride - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const ride = new RideLog({
      userId,
      bikeId: input.bikeId,
      title,
      status: 'RECORDING',
      startTime: new Date(),
      startLocation: {
        type: 'Point',
        coordinates: [input.startLocation.longitude, input.startLocation.latitude]
      },
      tags: input.tags || [],
      waypoints: [],
      pauseEvents: [],
      rideScore: 100
    });

    // Add initial start waypoint
    ride.waypoints.push({
      location: {
        type: 'Point',
        coordinates: [input.startLocation.longitude, input.startLocation.latitude]
      },
      altitude: input.startLocation.altitude || 0,
      accuracy: 5,
      bearing: 0,
      speedKmh: 0,
      speedMs: 0,
      heading: 0,
      distanceFromPreviousM: 0,
      segmentTimeSeconds: 0,
      timestamp: new Date(),
      provider: 'gps'
    });

    await ride.save();

    // Emit real-time Socket.IO event
    SocketManager.getInstance().emitToUser(userId, 'ride:started', {
      rideId: ride._id,
      title: ride.title,
      startTime: ride.startTime
    });

    return ride;
  }

  /**
   * Pause an active ride
   */
  static async pauseRide(userId: string, input: PauseRideInput): Promise<IRideLog> {
    const ride = await RideLog.findOne({ _id: input.rideId, userId, isSoftDeleted: false });
    if (!ride) throw new NotFoundError('Ride not found');

    if (ride.status !== 'RECORDING') {
      throw new BadRequestError(`Cannot pause ride in status ${ride.status}`);
    }

    ride.status = 'PAUSED';
    ride.pauseEvents.push({
      pausedAt: new Date()
    });

    await ride.save();

    SocketManager.getInstance().emitToUser(userId, 'ride:paused', {
      rideId: ride._id,
      pausedAt: new Date()
    });

    return ride;
  }

  /**
   * Resume a paused ride
   */
  static async resumeRide(userId: string, input: ResumeRideInput): Promise<IRideLog> {
    const ride = await RideLog.findOne({ _id: input.rideId, userId, isSoftDeleted: false });
    if (!ride) throw new NotFoundError('Ride not found');

    if (ride.status !== 'PAUSED') {
      throw new BadRequestError(`Cannot resume ride in status ${ride.status}`);
    }

    ride.status = 'RECORDING';
    const lastPause = ride.pauseEvents[ride.pauseEvents.length - 1];
    if (lastPause && !lastPause.resumedAt) {
      lastPause.resumedAt = new Date();
      lastPause.durationSeconds = Math.round((lastPause.resumedAt.getTime() - lastPause.pausedAt.getTime()) / 1000);
      ride.stoppedTimeSeconds += lastPause.durationSeconds;
    }

    await ride.save();

    SocketManager.getInstance().emitToUser(userId, 'ride:resumed', {
      rideId: ride._id,
      resumedAt: new Date()
    });

    return ride;
  }

  /**
   * Stop an active or paused ride and calculate final telemetry stats
   */
  static async stopRide(userId: string, input: StopRideInput): Promise<IRideLog> {
    const ride = await RideLog.findOne({ _id: input.rideId, userId, isSoftDeleted: false });
    if (!ride) throw new NotFoundError('Ride not found');

    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
      throw new BadRequestError(`Ride is already finalized with status ${ride.status}`);
    }

    const endTime = new Date();
    ride.endTime = endTime;
    ride.status = 'COMPLETED';

    if (input.notes) ride.notes = input.notes;

    if (input.endLocation) {
      ride.endLocation = {
        type: 'Point',
        coordinates: [input.endLocation.longitude, input.endLocation.latitude]
      };
    } else if (ride.waypoints.length > 0) {
      const lastPoint = ride.waypoints[ride.waypoints.length - 1];
      ride.endLocation = {
        type: 'Point',
        coordinates: lastPoint.location.coordinates
      };
    }

    // Process all calculations
    this.recalculateRideMetrics(ride);

    await ride.save();

    // Update bike odometer
    if (ride.distanceKm > 0) {
      const bike = await Bike.findById(ride.bikeId);
      if (bike) {
        bike.odometerKm = parseFloat((bike.odometerKm + ride.distanceKm).toFixed(2));
        bike.currentMileageKm = bike.odometerKm;
        await bike.save();
      }
    }

    SocketManager.getInstance().emitToUser(userId, 'ride:finished', {
      rideId: ride._id,
      distanceKm: ride.distanceKm,
      durationSeconds: ride.durationSeconds,
      avgSpeedKmh: ride.avgSpeedKmh
    });

    return ride;
  }

  /**
   * Append a single GPS location point to an active ride
   */
  static async addLocation(userId: string, input: AddLocationInput): Promise<IRideLog> {
    const ride = await RideLog.findOne({ _id: input.rideId, userId, isSoftDeleted: false });
    if (!ride) throw new NotFoundError('Ride not found');

    if (ride.status !== 'RECORDING') {
      throw new BadRequestError(`Cannot append location while ride is in ${ride.status} state`);
    }

    const pointTime = input.timestamp ? new Date(input.timestamp) : new Date();
    const lastPoint = ride.waypoints.length > 0 ? ride.waypoints[ride.waypoints.length - 1] : null;

    let distanceFromPrevM = 0;
    let segmentTimeSec = 0;

    if (lastPoint) {
      const [lastLon, lastLat] = lastPoint.location.coordinates;
      distanceFromPrevM = this.calculateDistanceMeters(lastLat, lastLon, input.latitude, input.longitude);
      segmentTimeSec = Math.max(1, Math.round((pointTime.getTime() - new Date(lastPoint.timestamp).getTime()) / 1000));
    }

    const speedKmh = input.speed ? parseFloat((input.speed > 50 ? input.speed : input.speed * 3.6).toFixed(2)) : 0;
    const speedMs = parseFloat((speedKmh / 3.6).toFixed(2));

    const waypoint: IWaypoint = {
      location: {
        type: 'Point',
        coordinates: [input.longitude, input.latitude]
      },
      altitude: input.altitude || 0,
      accuracy: input.accuracy || 0,
      bearing: input.bearing || 0,
      speedKmh,
      speedMs,
      heading: input.heading || input.bearing || 0,
      distanceFromPreviousM: distanceFromPrevM,
      segmentTimeSeconds: segmentTimeSec,
      timestamp: pointTime,
      provider: input.provider || 'gps',
      batteryLevel: input.batteryLevel,
      networkStatus: input.networkStatus
    };

    ride.waypoints.push(waypoint);
    this.recalculateRideMetrics(ride);

    await ride.save();

    SocketManager.getInstance().emitToUser(userId, 'location:updated', {
      rideId: ride._id,
      location: waypoint.location,
      speedKmh,
      distanceKm: ride.distanceKm
    });

    return ride;
  }

  /**
   * Append a batch of telemetry points to an active ride
   */
  static async addBatchTelemetry(userId: string, input: BatchTelemetryInput): Promise<IRideLog> {
    const ride = await RideLog.findOne({ _id: input.rideId, userId, isSoftDeleted: false });
    if (!ride) throw new NotFoundError('Ride not found');

    if (ride.status !== 'RECORDING') {
      throw new BadRequestError(`Cannot append telemetry while ride is in ${ride.status} state`);
    }

    for (const pt of input.points) {
      const pointTime = pt.timestamp ? new Date(pt.timestamp) : new Date();
      const lastPoint = ride.waypoints.length > 0 ? ride.waypoints[ride.waypoints.length - 1] : null;

      let distanceFromPrevM = 0;
      let segmentTimeSec = 0;

      if (lastPoint) {
        const [lastLon, lastLat] = lastPoint.location.coordinates;
        distanceFromPrevM = this.calculateDistanceMeters(lastLat, lastLon, pt.latitude, pt.longitude);
        segmentTimeSec = Math.max(1, Math.round((pointTime.getTime() - new Date(lastPoint.timestamp).getTime()) / 1000));
      }

      const speedKmh = pt.speed ? parseFloat((pt.speed > 50 ? pt.speed : pt.speed * 3.6).toFixed(2)) : 0;

      ride.waypoints.push({
        location: {
          type: 'Point',
          coordinates: [pt.longitude, pt.latitude]
        },
        altitude: pt.altitude || 0,
        accuracy: pt.accuracy || 0,
        bearing: pt.bearing || 0,
        speedKmh,
        speedMs: parseFloat((speedKmh / 3.6).toFixed(2)),
        heading: pt.heading || pt.bearing || 0,
        distanceFromPreviousM: distanceFromPrevM,
        segmentTimeSeconds: segmentTimeSec,
        timestamp: pointTime,
        provider: pt.provider || 'gps',
        batteryLevel: pt.batteryLevel,
        networkStatus: pt.networkStatus
      });
    }

    this.recalculateRideMetrics(ride);
    await ride.save();

    SocketManager.getInstance().emitToUser(userId, 'telemetry:updated', {
      rideId: ride._id,
      totalPoints: ride.waypoints.length,
      distanceKm: ride.distanceKm
    });

    return ride;
  }

  /**
   * Search and filter rides with pagination and spatial queries
   */
  static async getRides(userId: string, query: QueryRidesInput, isAdmin = false): Promise<{ rides: IRideLog[]; total: number; page: number; limit: number }> {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const filter: any = { isSoftDeleted: false };

    if (!isAdmin) {
      filter.userId = userId;
    }

    if (query.bikeId) filter.bikeId = query.bikeId;
    if (query.startDate || query.endDate) {
      filter.startTime = {};
      if (query.startDate) filter.startTime.$gte = new Date(query.startDate);
      if (query.endDate) filter.startTime.$lte = new Date(query.endDate);
    }
    if (query.minDistance || query.maxDistance) {
      filter.distanceKm = {};
      if (query.minDistance) filter.distanceKm.$gte = parseFloat(query.minDistance);
      if (query.maxDistance) filter.distanceKm.$lte = parseFloat(query.maxDistance);
    }
    if (query.minDuration || query.maxDuration) {
      filter.durationSeconds = {};
      if (query.minDuration) filter.durationSeconds.$gte = parseInt(query.minDuration, 10);
      if (query.maxDuration) filter.durationSeconds.$lte = parseInt(query.maxDuration, 10);
    }
    if (query.minAvgSpeed) {
      filter.avgSpeedKmh = { $gte: parseFloat(query.minAvgSpeed) };
    }
    if (query.tags) {
      filter.tags = { $in: query.tags.split(',') };
    }
    if (query.latitude && query.longitude && query.radiusKm) {
      const lat = parseFloat(query.latitude);
      const lng = parseFloat(query.longitude);
      const radiusMeters = parseFloat(query.radiusKm) * 1000;
      filter.startLocation = {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusMeters
        }
      };
    }

    const [rides, total] = await Promise.all([
      RideLog.find(filter).sort({ startTime: -1 }).skip(skip).limit(limit).exec(),
      RideLog.countDocuments(filter)
    ]);

    return { rides, total, page, limit };
  }

  /**
   * Get single ride details
   */
  static async getRideById(rideId: string, userId: string, isAdmin = false): Promise<IRideLog> {
    const ride = await RideLog.findOne({ _id: rideId, isSoftDeleted: false });
    if (!ride) throw new NotFoundError('Ride not found');

    if (!isAdmin && ride.userId.toString() !== userId) {
      throw new ForbiddenError('Access denied: Ride belongs to another rider');
    }

    return ride;
  }

  /**
   * Get ride replay keyframe dataset for animated playback
   */
  static async getRideReplay(rideId: string, userId: string, isAdmin = false): Promise<any> {
    const ride = await this.getRideById(rideId, userId, isAdmin);

    const keyframes = ride.waypoints.map((wp, index) => {
      const timeOffsetSec = Math.round((new Date(wp.timestamp).getTime() - new Date(ride.startTime).getTime()) / 1000);
      return {
        step: index + 1,
        timeOffsetSec,
        latitude: wp.location.coordinates[1],
        longitude: wp.location.coordinates[0],
        altitude: wp.altitude,
        speedKmh: wp.speedKmh,
        bearing: wp.bearing,
        timestamp: wp.timestamp
      };
    });

    return {
      rideId: ride._id,
      title: ride.title,
      startTime: ride.startTime,
      endTime: ride.endTime,
      totalDurationSeconds: ride.durationSeconds,
      totalDistanceKm: ride.distanceKm,
      totalPoints: keyframes.length,
      keyframes
    };
  }

  /**
   * Get rider aggregated ride statistics (Daily, Weekly, Monthly, Yearly, Longest, Fastest)
   */
  static async getRideStatistics(userId: string): Promise<any> {
    const rides = await RideLog.find({ userId, status: 'COMPLETED', isSoftDeleted: false });

    const totalRides = rides.length;
    const totalDistanceKm = parseFloat(rides.reduce((acc, r) => acc + r.distanceKm, 0).toFixed(2));
    const totalDurationSeconds = rides.reduce((acc, r) => acc + r.durationSeconds, 0);

    let longestRideKm = 0;
    let fastestRideKmh = 0;
    let highestElevationM = 0;

    for (const r of rides) {
      if (r.distanceKm > longestRideKm) longestRideKm = r.distanceKm;
      if (r.maxSpeedKmh > fastestRideKmh) fastestRideKmh = r.maxSpeedKmh;
      if (r.maxElevationM > highestElevationM) highestElevationM = r.maxElevationM;
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const dailyRides = rides.filter(r => new Date(r.startTime) >= startOfDay);
    const weeklyRides = rides.filter(r => new Date(r.startTime) >= startOfWeek);
    const monthlyRides = rides.filter(r => new Date(r.startTime) >= startOfMonth);
    const yearlyRides = rides.filter(r => new Date(r.startTime) >= startOfYear);

    return {
      totalRides,
      totalDistanceKm,
      totalDurationSeconds,
      records: {
        longestRideKm,
        fastestRideKmh,
        highestElevationM
      },
      timeframes: {
        today: { count: dailyRides.length, distanceKm: parseFloat(dailyRides.reduce((a, b) => a + b.distanceKm, 0).toFixed(2)) },
        thisWeek: { count: weeklyRides.length, distanceKm: parseFloat(weeklyRides.reduce((a, b) => a + b.distanceKm, 0).toFixed(2)) },
        thisMonth: { count: monthlyRides.length, distanceKm: parseFloat(monthlyRides.reduce((a, b) => a + b.distanceKm, 0).toFixed(2)) },
        thisYear: { count: yearlyRides.length, distanceKm: parseFloat(yearlyRides.reduce((a, b) => a + b.distanceKm, 0).toFixed(2)) }
      }
    };
  }

  /**
   * Export ride track in GPX XML open format
   */
  static async exportGPX(rideId: string, userId: string, isAdmin = false): Promise<string> {
    const ride = await this.getRideById(rideId, userId, isAdmin);

    let trkpts = '';
    for (const wp of ride.waypoints) {
      const lat = wp.location.coordinates[1];
      const lon = wp.location.coordinates[0];
      const isoTime = new Date(wp.timestamp).toISOString();
      trkpts += `      <trkpt lat="${lat}" lon="${lon}">\n        <ele>${wp.altitude}</ele>\n        <time>${isoTime}</time>\n        <speed>${wp.speedMs}</speed>\n      </trkpt>\n`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RidePulse v2.0 Enterprise Engine" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${ride.title}</name>
    <time>${ride.startTime.toISOString()}</time>
  </metadata>
  <trk>
    <name>${ride.title}</name>
    <trkseg>
${trkpts}    </trkseg>
  </trk>
</gpx>`;
  }

  /**
   * Export ride track in standard GeoJSON format
   */
  static async exportGeoJSON(rideId: string, userId: string, isAdmin = false): Promise<any> {
    const ride = await this.getRideById(rideId, userId, isAdmin);

    const coordinates = ride.waypoints.map(wp => [
      wp.location.coordinates[0],
      wp.location.coordinates[1],
      wp.altitude
    ]);

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates
          },
          properties: {
            rideId: ride._id,
            title: ride.title,
            startTime: ride.startTime,
            endTime: ride.endTime,
            distanceKm: ride.distanceKm,
            durationSeconds: ride.durationSeconds,
            avgSpeedKmh: ride.avgSpeedKmh,
            maxSpeedKmh: ride.maxSpeedKmh,
            elevationGainM: ride.elevationGainM,
            rideScore: ride.rideScore
          }
        }
      ]
    };
  }

  /**
   * Export ride track in CSV tabular format
   */
  static async exportCSV(rideId: string, userId: string, isAdmin = false): Promise<string> {
    const ride = await this.getRideById(rideId, userId, isAdmin);

    let csv = 'latitude,longitude,altitude,speed_kmh,bearing,accuracy,timestamp,provider\n';
    for (const wp of ride.waypoints) {
      const lat = wp.location.coordinates[1];
      const lon = wp.location.coordinates[0];
      csv += `${lat},${lon},${wp.altitude},${wp.speedKmh},${wp.bearing},${wp.accuracy},${new Date(wp.timestamp).toISOString()},${wp.provider}\n`;
    }

    return csv;
  }

  /**
   * Soft-delete a ride record
   */
  static async deleteRide(rideId: string, userId: string, isAdmin = false): Promise<boolean> {
    const ride = await this.getRideById(rideId, userId, isAdmin);
    ride.isSoftDeleted = true;
    ride.deletedAt = new Date();
    await ride.save();
    return true;
  }

  /**
   * Recalculate ride distance, elevation, moving time, pace, and scores from waypoints
   */
  private static recalculateRideMetrics(ride: IRideLog): void {
    if (ride.waypoints.length === 0) return;

    let totalDistM = 0;
    let movingDistM = 0;
    let movingTimeSec = 0;
    let maxSpeed = 0;
    let minSpeed = Infinity;
    let maxEle = -Infinity;
    let minEle = Infinity;
    let eleGain = 0;
    let eleLoss = 0;

    for (let i = 0; i < ride.waypoints.length; i++) {
      const wp = ride.waypoints[i];
      totalDistM += wp.distanceFromPreviousM;

      if (wp.speedKmh > 2) {
        movingDistM += wp.distanceFromPreviousM;
        movingTimeSec += wp.segmentTimeSeconds;
      }

      if (wp.speedKmh > maxSpeed) maxSpeed = wp.speedKmh;
      if (wp.speedKmh < minSpeed) minSpeed = wp.speedKmh;

      if (wp.altitude > maxEle) maxEle = wp.altitude;
      if (wp.altitude < minEle) minEle = wp.altitude;

      if (i > 0) {
        const prevEle = ride.waypoints[i - 1].altitude;
        const diff = wp.altitude - prevEle;
        if (diff > 0) eleGain += diff;
        if (diff < 0) eleLoss += Math.abs(diff);
      }
    }

    const lastPoint = ride.waypoints[ride.waypoints.length - 1];

    const endTime = ride.endTime || new Date(lastPoint.timestamp);
    const totalDurationSec = Math.max(1, Math.round((endTime.getTime() - new Date(ride.startTime).getTime()) / 1000));

    ride.distanceKm = parseFloat((totalDistM / 1000).toFixed(2));
    ride.movingDistanceKm = parseFloat((movingDistM / 1000).toFixed(2));
    ride.durationSeconds = totalDurationSec;
    ride.movingTimeSeconds = movingTimeSec;
    ride.stoppedTimeSeconds = Math.max(0, totalDurationSec - movingTimeSec);

    ride.maxSpeedKmh = parseFloat(maxSpeed.toFixed(2));
    ride.minSpeedKmh = minSpeed === Infinity ? 0 : parseFloat(minSpeed.toFixed(2));

    const totalHours = totalDurationSec / 3600;
    ride.avgSpeedKmh = totalHours > 0 ? parseFloat((ride.distanceKm / totalHours).toFixed(2)) : 0;

    const movingHours = movingTimeSec / 3600;
    ride.movingAvgSpeedKmh = movingHours > 0 ? parseFloat((ride.movingDistanceKm / movingHours).toFixed(2)) : 0;

    ride.avgPaceMinKm = ride.distanceKm > 0 ? parseFloat(((totalDurationSec / 60) / ride.distanceKm).toFixed(2)) : 0;

    ride.maxElevationM = maxEle === -Infinity ? 0 : parseFloat(maxEle.toFixed(1));
    ride.minElevationM = minEle === Infinity ? 0 : parseFloat(minEle.toFixed(1));
    ride.elevationGainM = parseFloat(eleGain.toFixed(1));
    ride.elevationLossM = parseFloat(eleLoss.toFixed(1));

    // Simple ride score algorithm based on speed consistency
    ride.rideScore = Math.min(100, Math.max(60, Math.round(100 - (ride.maxSpeedKmh > 120 ? (ride.maxSpeedKmh - 120) * 0.5 : 0))));
  }
}
