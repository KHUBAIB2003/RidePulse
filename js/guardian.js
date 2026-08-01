/**
 * Guardian Check-In Engine for RidePulse
 * Prompts rider at set intervals during ride. If unacknowledged within grace period,
 * auto-triggers emergency SOS dispatch with "guardian_timeout" payload flag.
 */

class GuardianEngine {
  constructor() {
    this.isEnabled = true;
    this.intervalMins = 30;
    this.graceSec = 120;
    this.remainingGraceSec = 120;
    
    this.contactName = 'Sarah Mercer (Spouse)';
    this.contactPhone = '+1 (555) 987-6543';

    this.checkInTimer = null;
    this.graceTimer = null;
    this.isPromptActive = false;
  }

  init() {
    this.loadSettings();
  }

  loadSettings() {
    const settings = StorageManager.getGuardianSettings();
    if (settings) {
      this.isEnabled = settings.enabled !== undefined ? settings.enabled : true;
      this.intervalMins = settings.intervalMins || 30;
      this.graceSec = settings.graceSec || 120;
      this.contactName = settings.contactName || 'Sarah Mercer (Spouse)';
      this.contactPhone = settings.contactPhone || '+1 (555) 987-6543';
    }
  }

  saveSettings(newSettings) {
    this.isEnabled = newSettings.enabled;
    this.intervalMins = parseInt(newSettings.intervalMins);
    this.graceSec = parseInt(newSettings.graceSec);
    this.contactName = newSettings.contactName;
    this.contactPhone = newSettings.contactPhone;

    StorageManager.saveGuardianSettings({
      enabled: this.isEnabled,
      intervalMins: this.intervalMins,
      graceSec: this.graceSec,
      contactName: this.contactName,
      contactPhone: this.contactPhone
    });

    if (window.app) window.app.showNotification('Guardian Check-In Settings Saved!', 'success');
  }

  startRideGuardian() {
    this.stopRideGuardian();
    if (!this.isEnabled) return;

    const intervalMs = this.intervalMins * 60 * 1000;
    this.checkInTimer = setInterval(() => {
      this.triggerCheckInPrompt();
    }, intervalMs);

    if (window.app) {
      window.app.showNotification(`🛡️ Guardian Check-In Active: Every ${this.intervalMins} min`, 'info');
    }
  }

  stopRideGuardian() {
    if (this.checkInTimer) clearInterval(this.checkInTimer);
    if (this.graceTimer) clearInterval(this.graceTimer);
    this.checkInTimer = null;
    this.graceTimer = null;
    this.hidePromptUI();
  }

  triggerCheckInPrompt() {
    if (this.isPromptActive) return;
    this.isPromptActive = true;
    this.remainingGraceSec = this.graceSec;

    // Play Alert Chime
    if (window.soundEngine) window.soundEngine.playChime();

    // Render & Show Floating Prompt Overlay
    const overlay = document.getElementById('guardian-prompt-overlay');
    if (overlay) overlay.classList.add('active');

    this.updateGraceCountdownUI();

    // Start Grace Period Countdown
    this.graceTimer = setInterval(() => {
      this.remainingGraceSec--;
      this.updateGraceCountdownUI();

      if (this.remainingGraceSec <= 0) {
        clearInterval(this.graceTimer);
        this.handleTimeoutSOS();
      }
    }, 1000);
  }

  acknowledgeCheckIn() {
    if (!this.isPromptActive) return;
    this.isPromptActive = false;

    if (this.graceTimer) clearInterval(this.graceTimer);
    this.graceTimer = null;

    this.hidePromptUI();

    if (window.soundEngine) window.soundEngine.playChime();
    if (window.app) {
      window.app.showNotification('✅ Check-In Acknowledged! Guardian notified rider is safe.', 'success');
    }
  }

  handleTimeoutSOS() {
    this.isPromptActive = false;
    this.hidePromptUI();

    if (window.soundEngine) window.soundEngine.startSirenAlert();
    if (window.app) {
      window.app.showNotification('⚠️ GUARDIAN TIMEOUT! Rider unresponsive to check-in prompt.', 'danger');
    }

    if (window.sosEngine) {
      window.sosEngine.triggerSOS(
        `Automated Guardian Check-In Missed (${this.intervalMins}m interval timeout). Rider unresponsive.`,
        'guardian_timeout'
      );
    }
  }

  hidePromptUI() {
    this.isPromptActive = false;
    const overlay = document.getElementById('guardian-prompt-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  updateGraceCountdownUI() {
    const timerEl = document.getElementById('guardian-countdown-val');
    if (timerEl) {
      const mins = Math.floor(this.remainingGraceSec / 60);
      const secs = this.remainingGraceSec % 60;
      timerEl.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }
}

window.GuardianEngine = GuardianEngine;
