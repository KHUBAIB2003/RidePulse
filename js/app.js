/**
 * Main Application Orchestrator for RidePulse
 * Links Digital Garage, Group Formation, Tracking, Mesh Network, Voice Intercom, SOS Engine,
 * Guardian Check-In, Community Hazard Reporting, and Sound FX.
 */

document.addEventListener('DOMContentLoaded', () => {
  window.app = new RidePulseApp();
  window.app.init();
});

class RidePulseApp {
  constructor() {
    this.currentView = 'garage-view';
    this.lastCompletedRide = null;
    this.selectedHazardCategory = 'POTHOLE';
  }

  init() {
    // Instantiate Core Engines
    window.digitalGarage = new DigitalGarage();
    window.rideGroup = new RideGroupEngine();
    window.trackingEngine = new BikeTrackingEngine();
    window.meshEngine = new MeshNetworkEngine();
    window.voiceEngine = new VoiceIntercomEngine();
    window.sosEngine = new SOSEngine();
    window.guardianEngine = new GuardianEngine();
    window.hazardEngine = new HazardEngine();

    // Initialize Subsystems
    window.digitalGarage.init();
    window.rideGroup.init();
    window.guardianEngine.init();
    window.hazardEngine.init();
    window.meshEngine.init('meshCanvas');
    
    // Initialize Voice Engine with Command Handler
    window.voiceEngine.init((cmdType, transcript) => {
      this.handleVoiceCommand(cmdType, transcript);
    });

    // Wire Navigation & UI Event Listeners
    this.setupNavigation();
    this.setupEventListeners();
    this.renderRideLogs();

    // Init Map after DOM layout renders
    setTimeout(() => {
      window.trackingEngine.initMap('map');
      if (window.hazardEngine) window.hazardEngine.plotAllHazardsOnMap();
    }, 400);

    this.showNotification('Welcome back to RidePulse! Digital Garage loaded.', 'info');
  }

  setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-item[data-view]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playClick();
        const targetView = btn.getAttribute('data-view');
        this.switchView(targetView);
      });
    });
  }

  switchView(viewId) {
    const views = document.querySelectorAll('.view-section');
    views.forEach(v => v.classList.remove('active'));

    const navBtns = document.querySelectorAll('.nav-item[data-view]');
    navBtns.forEach(b => b.classList.remove('active'));

    const selectedView = document.getElementById(viewId);
    if (selectedView) {
      selectedView.classList.add('active');
      this.currentView = viewId;
    }

    const activeNavBtn = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (activeNavBtn) activeNavBtn.classList.add('active');

    // Refresh views if needed
    if (viewId === 'garage-view') window.digitalGarage.refresh();
    if (viewId === 'tracking-view') {
      if (window.trackingEngine) window.trackingEngine.invalidateMapSize();
      if (window.hazardEngine) window.hazardEngine.renderHazardFeedUI();
    }
    if (viewId === 'mesh-view') window.meshEngine.resizeCanvas();
    if (viewId === 'logs-view') this.renderRideLogs();
  }

  setupEventListeners() {
    // Add Bike Modal Buttons
    const addBikeBtn = document.getElementById('btn-add-bike-modal');
    if (addBikeBtn) {
      addBikeBtn.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playClick();
        this.openModal('add-bike-modal');
      });
    }

    const saveBikeBtn = document.getElementById('btn-save-new-bike');
    if (saveBikeBtn) {
      saveBikeBtn.addEventListener('click', () => {
        const make = document.getElementById('input-bike-make').value;
        const model = document.getElementById('input-bike-model').value;
        const year = document.getElementById('input-bike-year').value;
        const mileage = document.getElementById('input-bike-mileage').value;

        if (make && model && mileage) {
          window.digitalGarage.addNewBike(make, model, year, mileage);
          this.closeModal('add-bike-modal');
          this.showNotification(`Added ${make} ${model} to Digital Garage!`, 'success');
        } else {
          this.showNotification('Please fill in make, model, and current mileage.', 'danger');
        }
      });
    }

    // Guardian Settings Modal & Actions
    const btnGuardianModal = document.getElementById('btn-open-guardian-modal');
    if (btnGuardianModal) {
      btnGuardianModal.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playClick();
        
        // Populate inputs
        const toggle = document.getElementById('input-guardian-toggle');
        const interval = document.getElementById('input-guardian-interval');
        const grace = document.getElementById('input-guardian-grace');
        const cName = document.getElementById('input-guardian-contact-name');
        const cPhone = document.getElementById('input-guardian-contact-phone');

        if (toggle) toggle.checked = window.guardianEngine.isEnabled;
        if (interval) interval.value = window.guardianEngine.intervalMins;
        if (grace) grace.value = window.guardianEngine.graceSec;
        if (cName) cName.value = window.guardianEngine.contactName;
        if (cPhone) cPhone.value = window.guardianEngine.contactPhone;

        this.openModal('guardian-settings-modal');
      });
    }

    const btnSaveGuardian = document.getElementById('btn-save-guardian-settings');
    if (btnSaveGuardian) {
      btnSaveGuardian.addEventListener('click', () => {
        const enabled = document.getElementById('input-guardian-toggle').checked;
        const intervalMins = document.getElementById('input-guardian-interval').value;
        const graceSec = document.getElementById('input-guardian-grace').value;
        const contactName = document.getElementById('input-guardian-contact-name').value;
        const contactPhone = document.getElementById('input-guardian-contact-phone').value;

        window.guardianEngine.saveSettings({ enabled, intervalMins, graceSec, contactName, contactPhone });
        
        const topbarStatus = document.getElementById('topbar-guardian-status');
        if (topbarStatus) {
          topbarStatus.innerText = enabled ? `${intervalMins}m` : 'Off';
        }

        this.closeModal('guardian-settings-modal');
      });
    }

    const btnAckGuardian = document.getElementById('btn-acknowledge-guardian');
    if (btnAckGuardian) {
      btnAckGuardian.addEventListener('click', () => {
        window.guardianEngine.acknowledgeCheckIn();
      });
    }

    // Location Search Bar & Route Navigation Listener
    const btnMapSearch = document.getElementById('btn-map-location-search');
    const btnMapNav = document.getElementById('btn-map-nav-route');
    const inputMapSearch = document.getElementById('input-map-location-search');
    if (btnMapSearch && inputMapSearch) {
      btnMapSearch.addEventListener('click', () => {
        window.trackingEngine.searchLocation(inputMapSearch.value);
      });
      inputMapSearch.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          window.trackingEngine.searchLocation(inputMapSearch.value);
        }
      });
    }

    if (btnMapNav && inputMapSearch) {
      btnMapNav.addEventListener('click', () => {
        window.trackingEngine.calculateRouteToDestination(inputMapSearch.value);
      });
    }

    // Report Road Hazard Modal & Actions
    const btnOpenReportHazard = document.getElementById('btn-open-report-hazard-modal');
    if (btnOpenReportHazard) {
      btnOpenReportHazard.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playClick();
        this.openModal('report-hazard-modal');
      });
    }

    const hazardCatBtns = document.querySelectorAll('.hazard-cat-btn');
    hazardCatBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        hazardCatBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedHazardCategory = btn.getAttribute('data-cat') || 'POTHOLE';
      });
    });

    const btnSubmitHazard = document.getElementById('btn-submit-hazard-report');
    if (btnSubmitHazard) {
      btnSubmitHazard.addEventListener('click', () => {
        const noteInput = document.getElementById('input-hazard-note');
        const note = noteInput ? noteInput.value : '';
        window.hazardEngine.reportHazard(this.selectedHazardCategory, note);
        if (noteInput) noteInput.value = '';
        this.closeModal('report-hazard-modal');
      });
    }

    // Service Expense Logbook Modal Buttons
    const openServiceBtn = document.getElementById('btn-open-service-modal');
    if (openServiceBtn) {
      openServiceBtn.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playClick();
        this.openModal('add-service-modal');
      });
    }

    const saveServiceBtn = document.getElementById('btn-save-service-expense');
    if (saveServiceBtn) {
      saveServiceBtn.addEventListener('click', () => {
        const type = document.getElementById('input-service-type').value;
        const cost = document.getElementById('input-service-cost').value;
        const mileage = document.getElementById('input-service-mileage').value || StorageManager.getActiveBike().currentMileage;
        const notes = document.getElementById('input-service-notes').value;

        if (type && cost) {
          window.digitalGarage.addServiceExpense(type, cost, mileage, notes);
          this.closeModal('add-service-modal');
        } else {
          this.showNotification('Please fill in service description and cost.', 'danger');
        }
      });
    }

    // Pre-Ride Safety Gate Button
    const checkGarageBtn = document.getElementById('btn-pre-ride-check');
    if (checkGarageBtn) {
      checkGarageBtn.addEventListener('click', () => {
        const activeBike = StorageManager.getActiveBike();
        const overview = window.digitalGarage.getBikeMaintenanceOverview(activeBike);

        if (overview.overdueCount > 0) {
          this.openModal('pre-ride-warning-modal');
        } else {
          if (window.soundEngine) window.soundEngine.playChime();
          this.showNotification('Garage Check Passed! Bike health good for ride.', 'success');
          this.switchView('group-view');
        }
      });
    }

    // Create / Join Group Buttons
    const btnCreateGroup = document.getElementById('btn-create-group');
    if (btnCreateGroup) {
      btnCreateGroup.addEventListener('click', () => {
        const grp = window.rideGroup.createGroup();
        if (window.soundEngine) window.soundEngine.playChime();
        this.showNotification(`Created Ride Group! Code: ${grp.code}`, 'success');
      });
    }

    const btnJoinGroup = document.getElementById('btn-join-group-submit');
    if (btnJoinGroup) {
      btnJoinGroup.addEventListener('click', () => {
        const code = document.getElementById('input-join-code').value;
        window.rideGroup.joinGroup(code);
      });
    }

    // Start Ride Button
    const btnStartRide = document.getElementById('btn-start-ride-launch');
    if (btnStartRide) {
      btnStartRide.addEventListener('click', () => {
        this.switchView('tracking-view');
        window.trackingEngine.startTracking();
        window.guardianEngine.startRideGuardian();
        window.voiceEngine.startListening();
      });
    }

    // Stop Ride Button
    const btnStopRide = document.getElementById('btn-stop-ride');
    if (btnStopRide) {
      btnStopRide.addEventListener('click', () => {
        const rideRecord = window.trackingEngine.stopTracking();
        window.guardianEngine.stopRideGuardian();
        if (rideRecord) {
          this.lastCompletedRide = rideRecord;
          this.renderPostRideModal(rideRecord);
          this.openModal('post-ride-modal');
        }
      });
    }

    // Crash Sensor Test Simulation Button
    const testCrashBtn = document.getElementById('btn-test-crash-sensor');
    if (testCrashBtn) {
      testCrashBtn.addEventListener('click', () => {
        window.trackingEngine.triggerSimulatedCrash();
      });
    }

    // GPX Export in Post-Ride Modal
    const exportGpxModalBtn = document.getElementById('btn-modal-gpx-export');
    if (exportGpxModalBtn) {
      exportGpxModalBtn.addEventListener('click', () => {
        if (this.lastCompletedRide) {
          window.trackingEngine.exportGPX(this.lastCompletedRide);
        }
      });
    }

    // Cellular Toggle Switch
    const cellToggle = document.getElementById('cellular-toggle');
    if (cellToggle) {
      cellToggle.addEventListener('change', (e) => {
        const isOnline = window.meshEngine.setCellularStatus(e.target.checked);
        if (window.soundEngine) window.soundEngine.playMeshPing();
        this.showNotification(
          isOnline ? 'Cellular Connection Restored (5G Direct)' : 'Cellular Signal Lost! Mesh Relay Active (Off-Grid)',
          isOnline ? 'success' : 'warning'
        );
      });
    }

    // Intercom Mute Toggle
    const btnMuteMic = document.getElementById('btn-toggle-mute-mic');
    if (btnMuteMic) {
      btnMuteMic.addEventListener('click', () => {
        const isMuted = window.voiceEngine.toggleMicMute();
        btnMuteMic.innerHTML = isMuted ? '<i class="fa-solid fa-microphone-slash"></i> Unmute Mic' : '<i class="fa-solid fa-microphone"></i> Mute Mic';
        if (window.soundEngine) window.soundEngine.playRadioBeep();
        this.showNotification(isMuted ? 'Intercom Mic Muted' : 'Intercom Mic Active', 'info');
      });
    }

    // SOS Emergency Trigger Button
    const sosBtn = document.getElementById('btn-sos-trigger');
    if (sosBtn) {
      sosBtn.addEventListener('click', () => {
        window.sosEngine.triggerSOS('Manual Screen SOS Trigger', 'manual_sos');
      });
    }

    const cancelSosBtn = document.getElementById('btn-cancel-sos');
    if (cancelSosBtn) {
      cancelSosBtn.addEventListener('click', () => {
        window.sosEngine.cancelSOS();
      });
    }

    // Voice Simulation Buttons
    const btnSimSos = document.getElementById('btn-simulate-voice-sos');
    if (btnSimSos) {
      btnSimSos.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playRadioBeep();
        this.handleVoiceCommand('SOS_TRIGGER', 'SOS Emergency');
      });
    }

    const btnSimStatus = document.getElementById('btn-simulate-voice-status');
    if (btnSimStatus) {
      btnSimStatus.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playRadioBeep();
        this.handleVoiceCommand('CHECK_STATUS', 'Check Status');
      });
    }
  }

  handleVoiceCommand(cmdType, transcript) {
    if (window.soundEngine) window.soundEngine.playRadioBeep();
    this.showNotification(`Voice Command Detected: "${transcript}"`, 'info');

    if (cmdType === 'SOS_TRIGGER') {
      window.sosEngine.triggerSOS(`Hands-Free Voice Command: "${transcript}"`, 'manual_sos');
    } else if (cmdType === 'MUTE_MIC') {
      window.voiceEngine.toggleMicMute();
    } else if (cmdType === 'UNMUTE_MIC') {
      window.voiceEngine.toggleMicMute();
    } else if (cmdType === 'CHECK_STATUS') {
      const spd = window.trackingEngine.speedKmh;
      const dist = window.trackingEngine.totalDistanceKm.toFixed(1);
      this.showNotification(`Status Check: ${spd} km/h • ${dist} km logged`, 'success');
    }
  }

  renderPostRideModal(rideRecord) {
    const container = document.getElementById('post-ride-summary-body');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align:center; margin-bottom:20px;">
        <div style="width:60px; height:60px; border-radius:50%; background:rgba(0,230,118,0.15); color:var(--success); display:flex; align-items:center; justify-content:center; font-size:2rem; margin:0 auto 12px;">
          <i class="fa-solid fa-flag-checkered"></i>
        </div>
        <h2 style="font-size:1.6rem; font-weight:800;">Ride Complete & Saved!</h2>
        <p style="color:var(--text-muted); font-size:0.9rem;">${rideRecord.date} • ${rideRecord.bikeName}</p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
        <div class="stat-box">
          <div class="stat-label">Distance Ridden</div>
          <div class="stat-value" style="color:var(--primary);">${rideRecord.distanceKm} km</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Duration</div>
          <div class="stat-value">${Math.floor(rideRecord.durationSec / 60)} mins</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Top Speed</div>
          <div class="stat-value">${rideRecord.topSpeedKmh} km/h</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Max Lean</div>
          <div class="stat-value" style="color:var(--primary);">${rideRecord.maxLeanRight || 41}° R</div>
        </div>
      </div>

      <div style="background:rgba(0,242,254,0.08); border:1px solid rgba(0,242,254,0.25); border-radius:12px; padding:14px; margin-bottom:20px;">
        <div style="font-weight:700; color:var(--primary); margin-bottom:4px; font-size:0.95rem;">
          <i class="fa-solid fa-sync"></i> Digital Garage Updated Automatically!
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted);">
          +${rideRecord.distanceKm} km added to ${rideRecord.bikeName} total odometer. Maintenance intervals recalculated for your next ride.
        </div>
      </div>
    `;
  }

  renderRideLogs() {
    const container = document.getElementById('ride-logs-list');
    if (!container) return;

    const logs = StorageManager.getRideLogs();
    if (logs.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--text-muted);">
          <i class="fa-solid fa-route" style="font-size:2.5rem; margin-bottom:12px; color:var(--text-dim);"></i>
          <p>No completed rides yet. Join a group and hit the road!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = logs.map((log, idx) => `
      <div class="glass-panel" style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
          <div>
            <div style="font-size:1.1rem; font-weight:700;">${log.bikeName}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">${log.date} at ${log.time}</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary" style="font-size:0.75rem; padding:4px 10px;" onclick="window.trackingEngine.exportGPX(StorageManager.getRideLogs()[${idx}])">
              <i class="fa-solid fa-download"></i> Export GPX
            </button>
            <span class="pill" style="background:rgba(0,242,254,0.1); color:var(--primary); border-color:rgba(0,242,254,0.3);">
              <i class="fa-solid fa-location-dot"></i> Saved Log
            </span>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; text-align:center; background:rgba(0,0,0,0.25); padding:10px; border-radius:8px;">
          <div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Distance</div>
            <div style="font-weight:700; color:var(--primary);">${log.distanceKm} km</div>
          </div>
          <div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Duration</div>
            <div style="font-weight:700;">${Math.floor(log.durationSec / 60)} min</div>
          </div>
          <div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Top Speed</div>
            <div style="font-weight:700;">${log.topSpeedKmh} km/h</div>
          </div>
          <div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Avg Speed</div>
            <div style="font-weight:700;">${log.avgSpeedKmh} km/h</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  showNotification(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const borderColors = { info: 'var(--primary)', success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)' };
    
    toast.style.cssText = `
      background: rgba(15, 23, 42, 0.95);
      border-left: 4px solid ${borderColors[type] || 'var(--primary)'};
      border-top: 1px solid var(--glass-border);
      border-right: 1px solid var(--glass-border);
      border-bottom: 1px solid var(--glass-border);
      color: #fff;
      padding: 12px 18px;
      border-radius: 10px;
      margin-bottom: 10px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.5);
      font-size: 0.9rem;
      font-weight: 500;
      animation: fadeIn 0.3s ease;
      backdrop-filter: blur(10px);
    `;

    toast.innerText = msg;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}
