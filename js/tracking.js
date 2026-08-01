/**
 * Bike Experience Tracking & GPS Telemetry Engine
 * Logs route polyline, live speed, distance, elevation, top speed, moving avg, Leaflet map markers.
 * Supports Lean Angle Telemetry, Map Style Switching, Crash Sensor Simulation, and GPX Export.
 */

class BikeTrackingEngine {
  constructor() {
    this.isTracking = false;
    this.isPaused = false;
    this.map = null;
    this.currentTileLayer = null;
    this.routePolyline = null;
    this.riderMarker = null;
    this.peerMarkers = {};
    
    this.currentPos = { lat: 37.7749, lng: -122.4194 };
    this.routePoints = [];
    this.totalDistanceKm = 0;
    this.speedKmh = 0;
    this.topSpeedKmh = 0;
    this.movingTimeSec = 0;
    this.startTime = null;

    // Lean Angle & Telemetry
    this.currentLeanAngle = 0;
    this.maxLeanLeft = 0;
    this.maxLeanRight = 0;
    this.currentGForce = 1.0;
    
    this.watchId = null;
    this.timerInterval = null;
    this.simulatedRouteTimer = null;
    this.simulatedIndex = 0;

    // Map Layer Configs (Includes Google Maps Streets, Satellite & Hybrid)
    this.tileLayers = {
      google: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      googleSat: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      googleHybrid: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    };

    // Scenic twisty motorcycle simulation route (San Francisco / Highway 1 coastal twisties)
    this.simulatedPath = [
      { lat: 37.7749, lng: -122.4194, speed: 42, ele: 45, lean: -12 },
      { lat: 37.7758, lng: -122.4210, speed: 58, ele: 52, lean: -28 },
      { lat: 37.7772, lng: -122.4235, speed: 74, ele: 68, lean: 15 },
      { lat: 37.7790, lng: -122.4260, speed: 89, ele: 85, lean: 41 },
      { lat: 37.7815, lng: -122.4282, speed: 102, ele: 110, lean: 8 },
      { lat: 37.7842, lng: -122.4310, speed: 65, ele: 124, lean: -35 },
      { lat: 37.7870, lng: -122.4345, speed: 92, ele: 140, lean: -44 },
      { lat: 37.7905, lng: -122.4380, speed: 115, ele: 165, lean: 12 },
      { lat: 37.7940, lng: -122.4412, speed: 84, ele: 180, lean: 38 },
      { lat: 37.7980, lng: -122.4450, speed: 68, ele: 195, lean: -19 },
      { lat: 37.8020, lng: -122.4490, speed: 96, ele: 210, lean: 26 },
      { lat: 37.8065, lng: -122.4530, speed: 108, ele: 205, lean: -5 }
    ];

    this.setupOrientationListener();
  }

  setupOrientationListener() {
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (e) => {
        if (this.isTracking && e.gamma !== null) {
          const rawLean = Math.round(e.gamma);
          this.updateLeanAngle(rawLean);
        }
      });
    }
  }

  initMap(mapElementId = 'map') {
    if (!window.L) return;

    try {
      this.map = L.map(mapElementId, { zoomControl: false }).setView([this.currentPos.lat, this.currentPos.lng], 14);

      // Default Google Maps Live Tile Layer
      this.currentTileLayer = L.tileLayer(this.tileLayers.google, {
        attribution: '&copy; Google Maps',
        maxZoom: 20
      }).addTo(this.map);

      this.currentTileLayer.on('tileerror', () => {
        if (!this.tileFallbackTriggered) {
          this.tileFallbackTriggered = true;
          console.warn('Map tile error, falling back to OpenStreetMap standard tiles.');
          this.switchMapLayer('osm');
        }
      });

      // Add Polyline
      this.routePolyline = L.polyline([], {
        color: '#00f2fe',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(this.map);

      // Custom Rider Icon
      const riderIcon = L.divIcon({
        className: 'custom-map-rider',
        html: `<div style="width:24px; height:24px; background:#00f2fe; border:3px solid #fff; border-radius:50%; box-shadow: 0 0 15px #00f2fe;"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      this.riderMarker = L.marker([this.currentPos.lat, this.currentPos.lng], { icon: riderIcon }).addTo(this.map);
      this.riderMarker.bindPopup('<b>You (Alex)</b><br>Ducati Panigale V4 S').openPopup();

      // Add Group Peer Markers
      this.addPeerMarker('peer_2', 'Dave R.', [37.7765, -122.4170], '#00e676');
      this.addPeerMarker('peer_3', 'Maya S.', [37.7780, -122.4150], '#7f00ff');

      // Ensure map dimensions recalculate after initial render & locate live device GPS
      this.invalidateMapSize();
      this.locateUserGPS();
    } catch (e) {
      console.error('Error initializing map:', e);
    }
  }

  locateUserGPS() {
    if (!('geolocation' in navigator)) {
      if (window.app) window.app.showNotification('Browser does not support Geolocation.', 'danger');
      return;
    }

    if (window.soundEngine) window.soundEngine.playClick();
    if (window.app) window.app.showNotification('📍 Locating your real-time physical GPS position...', 'info');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        this.currentPos = { lat: latitude, lng: longitude };

        if (this.map && this.riderMarker) {
          this.riderMarker.setLatLng([latitude, longitude]);
          this.map.setView([latitude, longitude], 16);
          this.riderMarker.bindPopup(`<b>Your Live GPS Location</b><br>Accuracy: ±${Math.round(accuracy)}m`).openPopup();
        }

        if (window.soundEngine) window.soundEngine.playChime();
        if (window.app) window.app.showNotification(`📍 Live GPS Locked! (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, 'success');
      },
      (err) => {
        console.warn('GPS location request error:', err.message);
        if (window.app) window.app.showNotification('GPS Access Denied/Unavailable. Type a city/address in the search bar below!', 'warning');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  async searchLocation(query) {
    if (!query || !query.trim()) return;

    if (window.soundEngine) window.soundEngine.playClick();
    if (window.app) window.app.showNotification(`🔍 Searching location: "${query}"...`, 'info');

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        this.currentPos = { lat, lng };

        if (this.map && this.riderMarker) {
          this.riderMarker.setLatLng([lat, lng]);
          this.map.setView([lat, lng], 14);
          this.riderMarker.bindPopup(`<b>${result.display_name.split(',')[0]}</b><br>${result.display_name}`).openPopup();
        }

        if (window.soundEngine) window.soundEngine.playChime();
        if (window.app) window.app.showNotification(`📍 Location Found: ${result.display_name.split(',')[0]}`, 'success');
      } else {
        if (window.app) window.app.showNotification(`No results found for "${query}".`, 'warning');
      }
    } catch (e) {
      console.error('Location search error:', e);
      if (window.app) window.app.showNotification('Location search error.', 'danger');
    }
  }

  invalidateMapSize() {
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 50);
      setTimeout(() => {
        this.map.invalidateSize();
      }, 300);
    }
  }

  toggleTraffic() {
    if (!this.map || !window.L) return;

    this.isTrafficEnabled = !this.isTrafficEnabled;

    if (this.trafficTileLayer) {
      this.map.removeLayer(this.trafficTileLayer);
      this.trafficTileLayer = null;
    }

    if (this.isTrafficEnabled) {
      // Google Live Traffic Tile Overlay Layer
      this.trafficTileLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps Traffic',
        maxZoom: 20,
        opacity: 0.85
      }).addTo(this.map);
    }

    const btn = document.getElementById('btn-toggle-traffic');
    if (btn) {
      btn.className = `map-style-btn ${this.isTrafficEnabled ? 'active' : ''}`;
      btn.innerHTML = `<i class="fa-solid fa-car-side" style="color:${this.isTrafficEnabled ? 'var(--success)' : 'var(--text-muted)'};"></i> Traffic: ${this.isTrafficEnabled ? 'ON' : 'OFF'}`;
    }

    if (window.soundEngine) window.soundEngine.playClick();
    if (window.app) {
      window.app.showNotification(
        this.isTrafficEnabled ? '🟢 Real-Time Google Traffic Layer Activated' : 'Traffic Layer Disabled',
        this.isTrafficEnabled ? 'success' : 'info'
      );
    }
  }

  async calculateRouteToDestination(destinationQuery) {
    if (!destinationQuery || !destinationQuery.trim()) {
      if (window.app) window.app.showNotification('Please enter a destination name or address.', 'danger');
      return;
    }

    if (window.soundEngine) window.soundEngine.playClick();
    if (window.app) window.app.showNotification(`🚦 Calculating Google Navigation Route to "${destinationQuery}"...`, 'info');

    try {
      // 1. Geocode Destination
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationQuery)}`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      if (!geoData || geoData.length === 0) {
        if (window.app) window.app.showNotification(`Destination "${destinationQuery}" not found.`, 'warning');
        return;
      }

      const destResult = geoData[0];
      const destLat = parseFloat(destResult.lat);
      const destLng = parseFloat(destResult.lon);
      const startPos = this.currentPos;

      // 2. Fetch OSRM Real Turn-by-Turn Driving Route
      const routeUrl = `https://router.project-osrm.org/route/v1/driving/${startPos.lng},${startPos.lat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
      const routeRes = await fetch(routeUrl);
      const routeData = await routeRes.json();

      if (!routeData.routes || routeData.routes.length === 0) {
        if (window.app) window.app.showNotification('Could not calculate driving route to destination.', 'warning');
        return;
      }

      const route = routeData.routes[0];
      const distanceKm = (route.distance / 1000).toFixed(1);
      const durationMins = Math.round(route.duration / 60);

      // 3. Clear Existing Nav Layers & Draw Google Navigation Blue Line
      if (this.navPolyline) this.map.removeLayer(this.navPolyline);
      if (this.destMarker) this.map.removeLayer(this.destMarker);

      const latLngs = route.geometry.coordinates.map(c => [c[1], c[0]]);
      
      this.navPolyline = L.polyline(latLngs, {
        color: '#1a73e8', // Google Blue
        weight: 7,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(this.map);

      // 4. Place Destination Pin
      const destIcon = L.divIcon({
        className: 'custom-map-dest',
        html: `<div style="width:32px; height:32px; background:#ea4335; border:2px solid #fff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:1rem; box-shadow:0 0 16px #ea4335;"><i class="fa-solid fa-flag-checkered"></i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      this.destMarker = L.marker([destLat, destLng], { icon: destIcon }).addTo(this.map);
      this.destMarker.bindPopup(`<b>${destResult.display_name.split(',')[0]}</b><br>${distanceKm} km away`).openPopup();

      // Fit map bounds to show full route
      this.map.fitBounds(this.navPolyline.getBounds(), { padding: [40, 40] });

      // 5. Update Navigation Turn-by-Turn Banner UI
      const banner = document.getElementById('nav-turn-banner');
      const instructionEl = document.getElementById('nav-turn-instruction');
      const etaEl = document.getElementById('nav-turn-eta');
      const distEl = document.getElementById('nav-turn-dist');
      const trafficEl = document.getElementById('nav-turn-traffic');

      if (banner) banner.style.display = 'flex';
      if (instructionEl) {
        const firstStep = route.legs[0]?.steps[1]?.maneuver?.instruction || `Head towards ${destResult.display_name.split(',')[0]}`;
        instructionEl.innerText = firstStep;
      }
      if (etaEl) etaEl.innerText = `${durationMins} min`;
      if (distEl) distEl.innerText = `${distanceKm} km`;
      if (trafficEl) trafficEl.innerText = durationMins > 40 ? 'Heavy Traffic' : durationMins > 20 ? 'Moderate' : 'Smooth Flow';

      if (window.soundEngine) window.soundEngine.playChime();
      if (window.app) window.app.showNotification(`🏁 Navigation Started: ${destResult.display_name.split(',')[0]} (${distanceKm} km • ${durationMins} min)`, 'success');

    } catch (e) {
      console.error('Route calculation error:', e);
      if (window.app) window.app.showNotification('Error calculating navigation route.', 'danger');
    }
  }

  cancelNavigation() {
    if (this.navPolyline) {
      this.map.removeLayer(this.navPolyline);
      this.navPolyline = null;
    }
    if (this.destMarker) {
      this.map.removeLayer(this.destMarker);
      this.destMarker = null;
    }

    const banner = document.getElementById('nav-turn-banner');
    if (banner) banner.style.display = 'none';

    if (window.soundEngine) window.soundEngine.playClick();
    if (window.app) window.app.showNotification('Navigation Cancelled.', 'info');
  }

  switchMapLayer(styleName) {
    if (!this.map || !this.tileLayers[styleName]) return;
    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }
    this.currentTileLayer = L.tileLayer(this.tileLayers[styleName], {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18
    }).addTo(this.map);

    const btns = document.querySelectorAll('.map-style-btn');
    btns.forEach(btn => {
      if (btn.getAttribute('onclick')?.includes(`'${styleName}'`)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (window.soundEngine) window.soundEngine.playClick();
  }

  addPeerMarker(id, name, coords, color) {
    if (!this.map || !window.L) return;
    const icon = L.divIcon({
      className: 'custom-map-peer',
      html: `<div style="width:18px; height:18px; background:${color}; border:2px solid #fff; border-radius:50%; box-shadow: 0 0 10px ${color};"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    const marker = L.marker(coords, { icon: icon }).addTo(this.map);
    marker.bindPopup(`<b>${name}</b><br>Group Peer`);
    this.peerMarkers[id] = marker;
  }

  addHazardMarker(hazard) {
    if (!this.map || !window.L) return;
    if (!this.hazardMarkers) this.hazardMarkers = {};

    if (this.hazardMarkers[hazard.id]) {
      this.map.removeLayer(this.hazardMarkers[hazard.id]);
    }

    const icon = L.divIcon({
      className: 'custom-map-hazard',
      html: `
        <div style="width:30px; height:30px; background:${hazard.color || '#ff9100'}; border:2px solid #fff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:0.85rem; box-shadow: 0 0 14px ${hazard.color || '#ff9100'};">
          <i class="fa-solid ${hazard.icon || 'fa-triangle-exclamation'}"></i>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const marker = L.marker([hazard.lat, hazard.lng], { icon: icon }).addTo(this.map);
    const popupHtml = `
      <div style="font-family:sans-serif; padding:4px;">
        <div style="font-weight:700; color:${hazard.color}; font-size:0.9rem; margin-bottom:4px;">
          <i class="fa-solid ${hazard.icon}"></i> ${hazard.categoryName}
        </div>
        <div style="font-size:0.82rem; margin-bottom:6px; color:#222;">${hazard.note}</div>
        <div style="font-size:0.75rem; color:#666; margin-bottom:8px;">Reported by ${hazard.reporter} (${hazard.dateStr})</div>
        <button onclick="window.hazardEngine.confirmHazard('${hazard.id}')" style="background:#0a101c; color:#00f2fe; border:1px solid #00f2fe; padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:700; cursor:pointer;">
          👍 Still There (${hazard.confirmations})
        </button>
      </div>
    `;

    marker.bindPopup(popupHtml);
    this.hazardMarkers[hazard.id] = marker;
  }

  startTracking() {
    if (this.isTracking) return;
    this.isTracking = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this.totalDistanceKm = 0;
    this.speedKmh = 0;
    this.topSpeedKmh = 0;
    this.movingTimeSec = 0;
    this.maxLeanLeft = 0;
    this.maxLeanRight = 0;
    this.routePoints = [];

    // Start Timer
    this.timerInterval = setInterval(() => {
      if (!this.isPaused) {
        this.movingTimeSec++;
        this.updateHUDTimerUI();
      }
    }, 1000);

    // Try HTML5 Geolocation API
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        pos => this.handleGPSUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.speed, pos.coords.altitude),
        err => console.warn('Geolocation fallback to route simulator:', err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
      );
    }

    // Start Simulated Twisty Route for desktop demo
    this.simulatedIndex = 0;
    this.simulatedRouteTimer = setInterval(() => {
      if (!this.isPaused) {
        const pt = this.simulatedPath[this.simulatedIndex % this.simulatedPath.length];
        this.handleGPSUpdate(pt.lat, pt.lng, pt.speed / 3.6, pt.ele);
        this.updateLeanAngle(pt.lean);
        this.simulatedIndex++;
      }
    }, 2500);

    if (window.soundEngine) window.soundEngine.playChime();
    if (window.app) window.app.showNotification('Bike Tracking Started! Logging GPS, Speed, Lean Angle & Mesh...', 'success');
  }

  pauseTracking() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  stopTracking() {
    if (!this.isTracking) return null;

    this.isTracking = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.simulatedRouteTimer) clearInterval(this.simulatedRouteTimer);
    if (this.watchId) navigator.geolocation.clearWatch(this.watchId);

    const activeBike = StorageManager.getActiveBike();

    const rideRecord = {
      id: 'ride_' + Date.now(),
      date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString(),
      durationSec: this.movingTimeSec,
      distanceKm: parseFloat(this.totalDistanceKm.toFixed(2)),
      avgSpeedKmh: this.movingTimeSec > 0 ? Math.round((this.totalDistanceKm / (this.movingTimeSec / 3600))) : 0,
      topSpeedKmh: Math.round(this.topSpeedKmh),
      maxLeanLeft: Math.abs(this.maxLeanLeft),
      maxLeanRight: Math.abs(this.maxLeanRight),
      maxGForce: parseFloat(this.currentGForce.toFixed(2)),
      bikeId: activeBike.id,
      bikeName: `${activeBike.make} ${activeBike.model}`,
      routePoints: this.routePoints
    };

    // Save to Ride Logs & Update Bike Mileage
    StorageManager.saveRideLog(rideRecord);

    if (rideRecord.distanceKm > 0) {
      StorageManager.updateBikeMileage(activeBike.id, rideRecord.distanceKm);
      if (window.digitalGarage) window.digitalGarage.refresh();
    }

    if (window.soundEngine) window.soundEngine.playChime();
    return rideRecord;
  }

  handleGPSUpdate(lat, lng, speedMps, ele) {
    const prevPos = this.currentPos;
    this.currentPos = { lat, lng };

    // Calculate Speed (km/h)
    this.speedKmh = speedMps ? Math.round(speedMps * 3.6) : Math.floor(Math.random() * 25) + 55;
    if (this.speedKmh > this.topSpeedKmh) this.topSpeedKmh = this.speedKmh;

    // Calculate G-Force
    this.currentGForce = 1.0 + (this.speedKmh / 180) * 0.4 + (Math.abs(this.currentLeanAngle) / 45) * 0.3;

    // Calculate Distance
    if (this.routePoints.length > 0) {
      const dist = this.haversineDistance(prevPos.lat, prevPos.lng, lat, lng);
      this.totalDistanceKm += dist;
    }

    this.routePoints.push({ lat, lng, time: Date.now(), speed: this.speedKmh, ele: ele || 180 });

    // Update Map
    if (this.map && this.routePolyline && this.riderMarker) {
      this.routePolyline.addLatLng([lat, lng]);
      this.riderMarker.setLatLng([lat, lng]);
      this.map.panTo([lat, lng]);
    }

    // Broadcast mesh location update packet periodically
    if (window.meshEngine && this.routePoints.length % 3 === 0) {
      window.meshEngine.sendPacket('LOCATION', { lat, lng, speed: this.speedKmh });
    }

    this.updateHUDValuesUI();
  }

  updateLeanAngle(angle) {
    this.currentLeanAngle = Math.max(-50, Math.min(50, angle));
    if (this.currentLeanAngle < 0 && Math.abs(this.currentLeanAngle) > Math.abs(this.maxLeanLeft)) {
      this.maxLeanLeft = this.currentLeanAngle;
    }
    if (this.currentLeanAngle > 0 && this.currentLeanAngle > this.maxLeanRight) {
      this.maxLeanRight = this.currentLeanAngle;
    }

    this.updateLeanAngleUI();
  }

  updateLeanAngleUI() {
    const angleValEl = document.getElementById('hud-lean-angle-val');
    const bikeVisualEl = document.getElementById('hud-bike-tilt-graphic');
    const gforceEl = document.getElementById('hud-gforce-val');

    if (angleValEl) {
      const dir = this.currentLeanAngle < 0 ? 'L' : this.currentLeanAngle > 0 ? 'R' : '';
      angleValEl.innerText = `${Math.abs(this.currentLeanAngle)}° ${dir}`;
    }
    if (bikeVisualEl) {
      bikeVisualEl.style.transform = `rotate(${this.currentLeanAngle}deg)`;
    }
    if (gforceEl) {
      gforceEl.innerText = `${this.currentGForce.toFixed(2)} G`;
    }
  }

  triggerSimulatedCrash() {
    if (window.app) window.app.showNotification('⚠️ CRASH SENSOR IMPACT DETECTED! (3.8 G Spike)', 'danger');
    if (window.soundEngine) window.soundEngine.startSirenAlert();
    if (window.sosEngine) {
      window.sosEngine.triggerSOS('Automated Crash Sensor Threshold Trigger (Rapid Deceleration + High Roll Angle)');
    }
  }

  exportGPX(rideRecord) {
    const pts = rideRecord.routePoints || [];
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    gpx += `<gpx version="1.1" creator="RidePulse Motorcycle App" xmlns="http://www.topografix.com/GPX/1/1">\n`;
    gpx += `  <metadata>\n`;
    gpx += `    <name>${rideRecord.bikeName} Ride - ${rideRecord.date}</name>\n`;
    gpx += `    <desc>Distance: ${rideRecord.distanceKm} km, Top Speed: ${rideRecord.topSpeedKmh} km/h</desc>\n`;
    gpx += `  </metadata>\n`;
    gpx += `  <trk>\n    <name>${rideRecord.bikeName} Track</name>\n    <trkseg>\n`;

    pts.forEach(p => {
      const isoTime = new Date(p.time || Date.now()).toISOString();
      gpx += `      <trkpt lat="${p.lat}" lon="${p.lng}">\n`;
      gpx += `        <ele>${p.ele || 180}</ele>\n`;
      gpx += `        <time>${isoTime}</time>\n`;
      gpx += `      </trkpt>\n`;
    });

    gpx += `    </trkseg>\n  </trk>\n</gpx>`;

    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RidePulse_${rideRecord.id}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.soundEngine) window.soundEngine.playChime();
    if (window.app) window.app.showNotification('GPX file exported successfully!', 'success');
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  updateHUDTimerUI() {
    const el = document.getElementById('hud-timer-val');
    if (el) {
      const mins = Math.floor(this.movingTimeSec / 60);
      const secs = this.movingTimeSec % 60;
      el.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  updateHUDValuesUI() {
    const speedEl = document.getElementById('hud-speed-val');
    const distEl = document.getElementById('hud-distance-val');
    const topSpeedEl = document.getElementById('hud-topspeed-val');

    if (speedEl) speedEl.innerText = this.speedKmh;
    if (distEl) distEl.innerText = this.totalDistanceKm.toFixed(1);
    if (topSpeedEl) topSpeedEl.innerText = Math.round(this.topSpeedKmh);
  }
}

window.BikeTrackingEngine = BikeTrackingEngine;
