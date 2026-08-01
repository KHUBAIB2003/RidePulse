/**
 * SOS Emergency Response Engine
 * Handles high-priority SOS alert broadcasts, emergency sound sirens, strobe overlays, and cancellation timer.
 */

class SOSEngine {
  constructor() {
    this.isSOSActive = false;
    this.countdownSeconds = 5;
    this.countdownTimer = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.audioCtx = null;
  }

  triggerSOS(reason = 'Manual Emergency Press', sosType = 'manual_sos') {
    if (this.isSOSActive) return;
    this.isSOSActive = true;
    this.countdownSeconds = 5;
    this.currentSOSType = sosType;

    // Show Overlay UI
    const overlay = document.getElementById('sos-overlay');
    const titleEl = document.querySelector('.sos-title');
    if (overlay) overlay.classList.add('active');
    if (titleEl) {
      titleEl.innerText = sosType === 'guardian_timeout' ? 'GUARDIAN TIMEOUT EMERGENCY' : 'SOS EMERGENCY ALERT';
    }

    this.startSirenSound();
    this.updateCountdownUI();

    // Start 5-second safety countdown before full dispatch
    this.countdownTimer = setInterval(() => {
      this.countdownSeconds--;
      this.updateCountdownUI();

      if (this.countdownSeconds <= 0) {
        clearInterval(this.countdownTimer);
        this.dispatchSOSPayload(reason, this.currentSOSType);
      }
    }, 1000);
  }

  cancelSOS() {
    this.isSOSActive = false;
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.stopSirenSound();

    const overlay = document.getElementById('sos-overlay');
    if (overlay) overlay.classList.remove('active');

    if (window.app) {
      window.app.showNotification('SOS Emergency Alert Cancelled.', 'warning');
    }
  }

  dispatchSOSPayload(reason, sosType = 'manual_sos') {
    const activeBike = StorageManager.getActiveBike();
    const rider = StorageManager.getRider();
    const pos = window.trackingEngine ? window.trackingEngine.currentPos : { lat: 37.7749, lng: -122.4194 };

    const sosPayload = {
      type: sosType, // "guardian_timeout" or "manual_sos"
      riderName: rider.name,
      phone: rider.phone,
      bike: `${activeBike.make} ${activeBike.model}`,
      coordinates: pos,
      reason: reason,
      emergencyContacts: rider.emergencyContacts,
      batteryLevel: '88%',
      timestamp: new Date().toLocaleTimeString()
    };

    // Relay through Mesh Network engine
    if (window.meshEngine) {
      window.meshEngine.sendPacket(sosType === 'guardian_timeout' ? 'GUARDIAN_SOS' : 'SOS', sosPayload);
    }

    // Update Overlay UI with dispatch confirmation
    const statusBox = document.getElementById('sos-dispatch-status');
    if (statusBox) {
      const isCellular = window.meshEngine ? window.meshEngine.isCellularOnline : true;
      const typeLabel = sosType === 'guardian_timeout' ? '[AUTOMATED GUARDIAN TIMEOUT]' : '[MANUAL SOS]';
      statusBox.innerHTML = `
        <div style="font-weight:700; color:#00e676; margin-bottom:6px;">
          <i class="fa-solid fa-circle-check"></i> DISPATCHED: ${typeLabel}
        </div>
        <div>Channel: <strong>${isCellular ? 'Cloud Cellular Broadcast' : 'Off-Grid Mesh Relay Hop (3 Peers)'}</strong></div>
        <div style="margin-top:4px; font-size:0.85rem; color:var(--text-muted);">
          Coordinates: ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)} • Contacts Notified
        </div>
      `;
    }

    if (window.app) {
      window.app.showNotification('CRITICAL: SOS Alert sent to Group & Emergency Contacts!', 'danger');
    }
  }

  updateCountdownUI() {
    const el = document.getElementById('sos-countdown-val');
    if (el) el.innerText = this.countdownSeconds;
  }

  startSirenSound() {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.sirenOsc = this.audioCtx.createOscillator();
      this.sirenGain = this.audioCtx.createGain();

      this.sirenOsc.type = 'sawtooth';
      this.sirenOsc.frequency.setValueAtTime(600, this.audioCtx.currentTime);

      // Pitch sweep siren
      const now = this.audioCtx.currentTime;
      for (let i = 0; i < 20; i++) {
        this.sirenOsc.frequency.linearRampToValueAtTime(1200, now + i * 0.5 + 0.25);
        this.sirenOsc.frequency.linearRampToValueAtTime(600, now + i * 0.5 + 0.5);
      }

      this.sirenGain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.audioCtx.destination);
      this.sirenOsc.start();
    } catch (e) {
      console.warn('Siren sound audio play error');
    }
  }

  stopSirenSound() {
    if (this.sirenOsc) {
      try {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
      } catch (e) {}
      this.sirenOsc = null;
    }
  }
}

window.SOSEngine = SOSEngine;
