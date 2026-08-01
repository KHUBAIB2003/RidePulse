/**
 * Ride Group Formation & QR Invite Engine
 * Manages host group creation, QR code rendering, join by access code, and peer ready roster.
 */

class RideGroupEngine {
  constructor() {
    this.currentGroup = null;
    this.members = [];
    this.accessCode = '';
  }

  init() {
    // Check if previously in group or create default solo group
    this.members = [
      { id: 'usr_1', name: 'You (Alex)', bike: 'Panigale V4 S', isHost: true, isReady: true, status: 'Connected (5G)' },
      { id: 'usr_2', name: 'Dave R.', bike: 'KTM 890 Adventure', isHost: false, isReady: true, status: 'Mesh Node (Hop 1)' },
      { id: 'usr_3', name: 'Maya S.', bike: 'Kawasaki Ninja 650', isHost: false, isReady: false, status: 'Mesh Node (Hop 2)' }
    ];
    this.accessCode = 'PULSE9';
  }

  createGroup(groupName = 'Sierra Pass Weekend Run') {
    this.accessCode = this.generateAccessCode();
    this.currentGroup = {
      name: groupName,
      code: this.accessCode,
      createdAt: new Date().toLocaleTimeString()
    };
    this.renderGroupUI();
    return this.currentGroup;
  }

  joinGroup(code) {
    if (!code || code.trim().length < 4) {
      if (window.app) window.app.showNotification('Invalid access code!', 'danger');
      return false;
    }
    this.accessCode = code.toUpperCase().trim();
    this.currentGroup = {
      name: `Rider Group (${this.accessCode})`,
      code: this.accessCode,
      createdAt: new Date().toLocaleTimeString()
    };
    this.renderGroupUI();
    if (window.app) window.app.showNotification(`Joined Group ${this.accessCode} successfully!`, 'success');
    return true;
  }

  generateAccessCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  renderGroupUI() {
    const codeDisplay = document.getElementById('group-code-display');
    if (codeDisplay) codeDisplay.innerText = this.accessCode;

    const qrContainer = document.getElementById('qr-code-canvas');
    if (qrContainer) {
      this.drawSVGQRCode(qrContainer, `RIDE_PULSE_GROUP:${this.accessCode}`);
    }

    const rosterContainer = document.getElementById('group-roster-container');
    if (rosterContainer) {
      rosterContainer.innerHTML = this.members.map(m => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.03); border:1px solid var(--glass-border); border-radius:var(--radius-md); margin-bottom:10px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--accent-purple)); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.9rem;">
              ${m.name.charAt(0)}
            </div>
            <div>
              <div style="font-weight:600;">${m.name} ${m.isHost ? '<span style="font-size:0.7rem; background:rgba(0,242,254,0.2); color:var(--primary); padding:2px 6px; border-radius:8px;">HOST</span>' : ''}</div>
              <div style="font-size:0.8rem; color:var(--text-muted);">${m.bike} • ${m.status}</div>
            </div>
          </div>
          <div>
            <span class="badge" style="background:${m.isReady ? 'rgba(0,230,118,0.15)' : 'rgba(255,145,0,0.15)'}; color:${m.isReady ? 'var(--success)' : 'var(--warning)'}; border:1px solid ${m.isReady ? 'rgba(0,230,118,0.3)' : 'rgba(255,145,0,0.3)'}; padding:4px 10px; border-radius:12px; font-size:0.8rem; font-weight:600;">
              ${m.isReady ? 'READY TO RIDE' : 'PREPARING'}
            </span>
          </div>
        </div>
      `).join('');
    }
  }

  drawSVGQRCode(container, text) {
    // Elegant SVG QR Code visual pattern generator
    container.innerHTML = `
      <svg width="140" height="140" viewBox="0 0 100 100" style="background:#fff; padding:10px; border-radius:12px;">
        <!-- Corner Markers -->
        <rect x="5" y="5" width="25" height="25" fill="#0f172a" rx="4" />
        <rect x="10" y="10" width="15" height="15" fill="#fff" rx="2" />
        <rect x="14" y="14" width="7" height="7" fill="#00f2fe" />

        <rect x="70" y="5" width="25" height="25" fill="#0f172a" rx="4" />
        <rect x="75" y="10" width="15" height="15" fill="#fff" rx="2" />
        <rect x="79" y="14" width="7" height="7" fill="#00f2fe" />

        <rect x="5" y="70" width="25" height="25" fill="#0f172a" rx="4" />
        <rect x="10" y="75" width="15" height="15" fill="#fff" rx="2" />
        <rect x="14" y="79" width="7" height="7" fill="#00f2fe" />

        <!-- Data Matrix Pattern -->
        <rect x="36" y="10" width="6" height="6" fill="#0f172a" />
        <rect x="48" y="10" width="6" height="6" fill="#0f172a" />
        <rect x="36" y="24" width="6" height="6" fill="#0f172a" />
        <rect x="48" y="24" width="6" height="6" fill="#0f172a" />
        <rect x="10" y="36" width="6" height="6" fill="#0f172a" />
        <rect x="24" y="36" width="6" height="6" fill="#0f172a" />
        <rect x="36" y="36" width="12" height="12" fill="#0f172a" rx="2" />
        <rect x="54" y="36" width="6" height="6" fill="#0f172a" />
        <rect x="70" y="36" width="6" height="6" fill="#0f172a" />
        <rect x="84" y="36" width="6" height="6" fill="#0f172a" />
        <rect x="36" y="54" width="6" height="6" fill="#0f172a" />
        <rect x="48" y="54" width="12" height="12" fill="#0f172a" rx="2" />
        <rect x="70" y="54" width="6" height="6" fill="#0f172a" />
        <rect x="84" y="54" width="6" height="6" fill="#0f172a" />
        <rect x="36" y="74" width="6" height="6" fill="#0f172a" />
        <rect x="54" y="74" width="6" height="6" fill="#0f172a" />
        <rect x="70" y="74" width="12" height="12" fill="#0f172a" rx="2" />
      </svg>
    `;
  }
}

window.RideGroupEngine = RideGroupEngine;
