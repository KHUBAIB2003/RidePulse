/**
 * Community Hazard Reporting Engine for RidePulse
 * Stores geotagged hazard reports in IndexedDB (with LocalStorage fallback),
 * renders Leaflet map markers, propagates via P2P Mesh Network event bus, and updates Hazard Feed.
 */

const HAZARD_CATEGORIES = {
  POTHOLE: { name: 'Pothole / Road Damage', icon: 'fa-road-spikes', color: '#ff9100', badgeClass: 'badge-warning' },
  DEBRIS: { name: 'Debris / Oil Spill / Gravel', icon: 'fa-triangle-exclamation', color: '#ffab00', badgeClass: 'badge-warning' },
  ACCIDENT: { name: 'Traffic Crash / Stalled Bike', icon: 'fa-car-burst', color: '#ff1744', badgeClass: 'badge-danger' },
  SIGNAL_DOWN: { name: 'Blind Corner / Signal Down', icon: 'fa-wifi', color: '#d500f9', badgeClass: 'badge-purple' },
  ANIMAL: { name: 'Wildlife / Animal on Road', icon: 'fa-paw', color: '#00e676', badgeClass: 'badge-success' }
};

class HazardEngine {
  constructor() {
    this.dbName = 'RidePulse_DB';
    this.storeName = 'hazards';
    this.db = null;
    this.hazardsList = [];
  }

  async init() {
    try {
      await this.initIndexedDB();
    } catch (e) {
      console.warn('IndexedDB unavailable, falling back to LocalStorage:', e);
    }
    await this.loadHazards();
    
    // Seed sample demo hazards if empty
    if (this.hazardsList.length === 0) {
      await this.seedDemoHazards();
    }

    this.renderHazardFeedUI();
    this.plotAllHazardsOnMap();
  }

  initIndexedDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject('IndexedDB not supported');
        return;
      }

      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };

      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      req.onerror = (e) => reject(e.target.error);
    });
  }

  async loadHazards() {
    if (this.db) {
      this.hazardsList = await new Promise((resolve) => {
        const tx = this.db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } else {
      const data = localStorage.getItem('ridepulse_hazards');
      this.hazardsList = data ? JSON.parse(data) : [];
    }

    // Sort recency descending
    this.hazardsList.sort((a, b) => b.timestamp - a.timestamp);
  }

  async saveHazardToStorage(hazard) {
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(hazard);
        tx.oncomplete = () => resolve();
      });
    } else {
      const existing = this.hazardsList.filter(h => h.id !== hazard.id);
      existing.unshift(hazard);
      localStorage.setItem('ridepulse_hazards', JSON.stringify(existing));
    }
  }

  async reportHazard(categoryKey, note, coords = null) {
    const activeBike = StorageManager.getActiveBike();
    const rider = StorageManager.getRider();

    const currentPos = coords || (window.trackingEngine ? window.trackingEngine.currentPos : { lat: 37.7772, lng: -122.4235 });
    const cat = HAZARD_CATEGORIES[categoryKey] || HAZARD_CATEGORIES.POTHOLE;

    const hazard = {
      id: 'hzd_' + Date.now(),
      categoryKey: categoryKey,
      categoryName: cat.name,
      icon: cat.icon,
      color: cat.color,
      note: note || 'Hazard reported by rider',
      reporter: rider.name || 'Rider Alex',
      bike: `${activeBike.make} ${activeBike.model}`,
      lat: currentPos.lat,
      lng: currentPos.lng,
      timestamp: Date.now(),
      dateStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confirmations: 1
    };

    await this.saveHazardToStorage(hazard);
    this.hazardsList.unshift(hazard);

    // 1. Broadcast via Mesh Relay
    if (window.meshEngine) {
      window.meshEngine.sendPacket('HAZARD', hazard);
    }

    // 2. Plot on Leaflet Map
    if (window.trackingEngine) {
      window.trackingEngine.addHazardMarker(hazard);
    }

    // 3. Update Feed UI
    this.renderHazardFeedUI();

    if (window.soundEngine) window.soundEngine.playChime();
    if (window.app) window.app.showNotification(`⚠️ Hazard Reported: ${cat.name}! Broadcasted to crew.`, 'warning');

    return hazard;
  }

  async confirmHazard(hazardId) {
    const hazard = this.hazardsList.find(h => h.id === hazardId);
    if (!hazard) return;

    hazard.confirmations++;
    await this.saveHazardToStorage(hazard);

    this.renderHazardFeedUI();
    if (window.trackingEngine) {
      window.trackingEngine.addHazardMarker(hazard);
    }

    if (window.soundEngine) window.soundEngine.playChime();
    if (window.app) window.app.showNotification(`👍 Confirmed Hazard: "${hazard.categoryName}" (${hazard.confirmations} confirmations)`, 'success');
  }

  async seedDemoHazards() {
    const samples = [
      {
        id: 'hzd_demo_1',
        categoryKey: 'POTHOLE',
        categoryName: HAZARD_CATEGORIES.POTHOLE.name,
        icon: HAZARD_CATEGORIES.POTHOLE.icon,
        color: HAZARD_CATEGORIES.POTHOLE.color,
        note: 'Deep pot hole on apex of right curve. Slow down!',
        reporter: 'Dave R. (KTM 890)',
        lat: 37.7772,
        lng: -122.4235,
        timestamp: Date.now() - 15 * 60 * 1000,
        dateStr: '15 mins ago',
        confirmations: 3
      },
      {
        id: 'hzd_demo_2',
        categoryKey: 'DEBRIS',
        categoryName: HAZARD_CATEGORIES.DEBRIS.name,
        icon: HAZARD_CATEGORIES.DEBRIS.icon,
        color: HAZARD_CATEGORIES.DEBRIS.color,
        note: 'Loose gravel & spilled diesel fuel on coastal highway.',
        reporter: 'Maya S. (Ninja 650)',
        lat: 37.7842,
        lng: -122.4310,
        timestamp: Date.now() - 32 * 60 * 1000,
        dateStr: '32 mins ago',
        confirmations: 5
      },
      {
        id: 'hzd_demo_3',
        categoryKey: 'ANIMAL',
        categoryName: HAZARD_CATEGORIES.ANIMAL.name,
        icon: HAZARD_CATEGORIES.ANIMAL.icon,
        color: HAZARD_CATEGORIES.ANIMAL.color,
        note: 'Deer crossing near blind bend.',
        reporter: 'Alex M. (Panigale V4 S)',
        lat: 37.7940,
        lng: -122.4412,
        timestamp: Date.now() - 5 * 60 * 1000,
        dateStr: '5 mins ago',
        confirmations: 2
      }
    ];

    for (const s of samples) {
      await this.saveHazardToStorage(s);
      this.hazardsList.push(s);
    }
  }

  plotAllHazardsOnMap() {
    if (window.trackingEngine && window.trackingEngine.map) {
      this.hazardsList.forEach(h => window.trackingEngine.addHazardMarker(h));
    }
  }

  renderHazardFeedUI() {
    const container = document.getElementById('hazard-feed-container');
    const badgeCountEl = document.getElementById('hazard-feed-badge-count');
    if (!container) return;

    if (badgeCountEl) badgeCountEl.innerText = `${this.hazardsList.length} Active`;

    if (this.hazardsList.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">
          <i class="fa-solid fa-shield" style="font-size:1.8rem; margin-bottom:8px; color:var(--success);"></i>
          <p>No active hazards reported nearby. Ride safe!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.hazardsList.map(h => `
      <div style="background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); border-left:4px solid ${h.color}; border-radius:8px; padding:10px 12px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <div style="font-weight:700; font-size:0.85rem; color:${h.color}; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid ${h.icon}"></i> ${h.categoryName}
          </div>
          <span style="font-size:0.7rem; color:var(--text-muted);">${h.dateStr}</span>
        </div>
        
        <div style="font-size:0.82rem; color:var(--text-main); margin-bottom:6px;">${h.note}</div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-muted);">
          <span>By <strong>${h.reporter}</strong></span>
          <button class="btn btn-secondary" style="font-size:0.7rem; padding:3px 8px; border-color:rgba(0,242,254,0.3);" onclick="window.hazardEngine.confirmHazard('${h.id}')">
            <i class="fa-solid fa-thumbs-up"></i> Still There (${h.confirmations})
          </button>
        </div>
      </div>
    `).join('');
  }
}

window.HazardEngine = HazardEngine;
