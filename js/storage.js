/**
 * Storage Engine for RidePulse
 * Manages persistent storage via LocalStorage with fallback defaults.
 */

const STORAGE_KEYS = {
  RIDER: 'ridepulse_rider',
  GARAGE: 'ridepulse_garage',
  ACTIVE_BIKE: 'ridepulse_active_bike',
  RIDE_LOGS: 'ridepulse_ride_logs',
  SERVICE_LOGS: 'ridepulse_service_logs',
  GUARDIAN: 'ridepulse_guardian',
  SETTINGS: 'ridepulse_settings'
};

const DEFAULT_GUARDIAN = {
  enabled: true,
  intervalMins: 30,
  graceSec: 120,
  contactName: 'Sarah Mercer (Spouse)',
  contactPhone: '+1 (555) 987-6543'
};

// Default Initial Data
const DEFAULT_RIDER = {
  name: 'Alex Mercer',
  callsign: 'ApexRider',
  phone: '+1 (555) 019-2834',
  emergencyContacts: [
    { name: 'Sarah Mercer (Spouse)', phone: '+1 (555) 987-6543' },
    { name: 'Moto Club Support', phone: '+1 (800) 555-MOTO' }
  ]
};

const DEFAULT_GARAGE = [
  {
    id: 'bike_1',
    make: 'Ducati',
    model: 'Panigale V4 S',
    year: 2023,
    currentMileage: 4850,
    lastOilChangeMileage: 4200,
    oilIntervalKm: 3000,
    lastBrakeCheckMileage: 3500,
    brakeIntervalKm: 2500,
    lastChainLubeMileage: 4600,
    chainIntervalKm: 500,
    lastTireCheckMileage: 3000,
    tireIntervalKm: 4000,
    notes: 'Desmo service due at 12,000 km.'
  },
  {
    id: 'bike_2',
    make: 'BMW',
    model: 'R 1250 GS Adventure',
    year: 2022,
    currentMileage: 14200,
    lastOilChangeMileage: 11000,
    oilIntervalKm: 5000,
    lastBrakeCheckMileage: 12000,
    brakeIntervalKm: 4000,
    lastChainLubeMileage: 14000,
    chainIntervalKm: 800,
    lastTireCheckMileage: 10000,
    tireIntervalKm: 6000,
    notes: 'Touring panniers mounted.'
  }
];

const DEFAULT_SERVICE_LOGS = [
  {
    id: 'srv_1',
    bikeId: 'bike_1',
    bikeName: 'Ducati Panigale V4 S',
    type: 'Full Synthetic Oil Change & Filter',
    cost: 180,
    mileage: 4200,
    date: '2026-06-15',
    notes: 'Shell Advance Ultra 15W-50 + OEM Filter'
  },
  {
    id: 'srv_2',
    bikeId: 'bike_1',
    bikeName: 'Ducati Panigale V4 S',
    type: 'Pirelli Diablo Supercorsa SP Rear Tire',
    cost: 290,
    mileage: 3000,
    date: '2026-05-10',
    notes: 'Replaced rear tire due to track day wear.'
  }
];

class StorageManager {
  static getRider() {
    const data = localStorage.getItem(STORAGE_KEYS.RIDER);
    return data ? JSON.parse(data) : DEFAULT_RIDER;
  }

  static saveRider(riderData) {
    localStorage.setItem(STORAGE_KEYS.RIDER, JSON.stringify(riderData));
  }

  static getGarage() {
    const data = localStorage.getItem(STORAGE_KEYS.GARAGE);
    return data ? JSON.parse(data) : DEFAULT_GARAGE;
  }

  static saveGarage(garageData) {
    localStorage.setItem(STORAGE_KEYS.GARAGE, JSON.stringify(garageData));
  }

  static getActiveBikeId() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_BIKE) || 'bike_1';
  }

  static setActiveBikeId(bikeId) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BIKE, bikeId);
  }

  static getActiveBike() {
    const garage = this.getGarage();
    const activeId = this.getActiveBikeId();
    return garage.find(b => b.id === activeId) || garage[0];
  }

  static addBike(newBike) {
    const garage = this.getGarage();
    newBike.id = 'bike_' + Date.now();
    garage.push(newBike);
    this.saveGarage(garage);
    this.setActiveBikeId(newBike.id);
    return newBike;
  }

  static updateBikeMileage(bikeId, distanceAddedKm) {
    const garage = this.getGarage();
    const bike = garage.find(b => b.id === bikeId);
    if (bike) {
      bike.currentMileage = parseFloat((bike.currentMileage + distanceAddedKm).toFixed(1));
      this.saveGarage(garage);
    }
    return bike;
  }

  static getRideLogs() {
    const data = localStorage.getItem(STORAGE_KEYS.RIDE_LOGS);
    return data ? JSON.parse(data) : [];
  }

  static saveRideLog(rideRecord) {
    const logs = this.getRideLogs();
    logs.unshift(rideRecord); // Most recent first
    localStorage.setItem(STORAGE_KEYS.RIDE_LOGS, JSON.stringify(logs));
  }

  static getServiceLogs() {
    const data = localStorage.getItem(STORAGE_KEYS.SERVICE_LOGS);
    return data ? JSON.parse(data) : DEFAULT_SERVICE_LOGS;
  }

  static saveServiceLog(serviceRecord) {
    const logs = this.getServiceLogs();
    logs.unshift(serviceRecord);
    localStorage.setItem(STORAGE_KEYS.SERVICE_LOGS, JSON.stringify(logs));
  }

  static getGuardianSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.GUARDIAN);
    return data ? JSON.parse(data) : DEFAULT_GUARDIAN;
  }

  static saveGuardianSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.GUARDIAN, JSON.stringify(settings));
  }
}

window.StorageManager = StorageManager;
