/**
 * Voice-Command Intercom Engine
 * Manages Web Speech API recognition for hands-free rider controls and Web Audio intercom mic processing.
 */

class VoiceIntercomEngine {
  constructor() {
    this.isMicMuted = false;
    this.isListening = false;
    this.recognition = null;
    this.audioCtx = null;
    this.mediaStream = null;
    this.audioMeterLevel = 0;
    this.onCommandCallback = null;
  }

  init(onCommandCallback) {
    this.onCommandCallback = onCommandCallback;
    this.setupSpeechRecognition();
  }

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser. Simulated commands enabled.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
      console.log('Voice Command Heard:', transcript);

      this.parseVoiceCommand(transcript);
    };

    this.recognition.onerror = (err) => {
      console.warn('Speech recognition error:', err.error);
    };

    this.recognition.onend = () => {
      // Auto restart if continuous hands-free active
      if (this.isListening) {
        try { this.recognition.start(); } catch (e) {}
      }
    };
  }

  startListening() {
    this.isListening = true;
    if (this.recognition) {
      try { this.recognition.start(); } catch (e) {}
    }
    this.initAudioContext();
    this.updateVoxPillUI();
  }

  stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
    this.updateVoxPillUI();
  }

  toggleMicMute() {
    this.isMicMuted = !this.isMicMuted;
    this.playTone(this.isMicMuted ? 440 : 880, 0.15); // Mute high/low beep
    this.updateVoxPillUI();
    return this.isMicMuted;
  }

  parseVoiceCommand(transcript) {
    if (this.onCommandCallback) {
      if (transcript.includes('sos') || transcript.includes('emergency') || transcript.includes('help')) {
        this.onCommandCallback('SOS_TRIGGER', transcript);
      } else if (transcript.includes('mute') && !transcript.includes('unmute')) {
        this.isMicMuted = true;
        this.updateVoxPillUI();
        this.onCommandCallback('MUTE_MIC', transcript);
      } else if (transcript.includes('unmute')) {
        this.isMicMuted = false;
        this.updateVoxPillUI();
        this.onCommandCallback('UNMUTE_MIC', transcript);
      } else if (transcript.includes('status') || transcript.includes('speed')) {
        this.onCommandCallback('CHECK_STATUS', transcript);
      }
    }
  }

  initAudioContext() {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  playTone(frequency, duration) {
    if (!this.audioCtx) this.initAudioContext();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }

  updateVoxPillUI() {
    const pill = document.getElementById('vox-status-pill');
    if (pill) {
      if (this.isMicMuted) {
        pill.className = 'pill';
        pill.style.borderColor = 'rgba(255,23,68,0.4)';
        pill.style.color = '#ff1744';
        pill.innerHTML = '<i class="fa-solid fa-microphone-slash"></i> Intercom Muted';
      } else if (this.isListening) {
        pill.className = 'pill vox-active';
        pill.style.borderColor = ''; pill.style.color = '';
        pill.innerHTML = '<span class="dot-indicator"></span> Intercom Active (VOX)';
      } else {
        pill.className = 'pill';
        pill.innerHTML = '<i class="fa-solid fa-microphone"></i> Intercom Standby';
      }
    }
  }
}

window.VoiceIntercomEngine = VoiceIntercomEngine;
