/**
 * Off-Grid Mesh Network Protocol Engine
 * Simulates P2P hop-by-hop packet relay across group rider devices when cellular signal is lost.
 */

class MeshNetworkEngine {
  constructor() {
    this.isCellularOnline = true;
    this.nodes = [
      { id: 'node_self', name: 'You (Alex)', bike: 'Panigale V4 S', lat: 37.7749, lng: -122.4194, isSelf: true, rssi: -45, hasCellular: false },
      { id: 'node_2', name: 'Dave R.', bike: 'KTM 890 Adventure', lat: 37.7765, lng: -122.4170, isSelf: false, rssi: -65, hasCellular: false },
      { id: 'node_3', name: 'Maya S.', bike: 'Kawasaki Ninja 650', lat: 37.7780, lng: -122.4150, isSelf: false, rssi: -78, hasCellular: true }, // Has cell link
      { id: 'node_gateway', name: 'Cell Tower Gateway', bike: 'Base Station', lat: 37.7810, lng: -122.4120, isSelf: false, rssi: -90, isGateway: true, hasCellular: true }
    ];

    this.packetLog = [];
    this.activePackets = []; // Animation objects for canvas
    this.canvas = null;
    this.ctx = null;
    this.animFrame = null;
  }

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
      this.startCanvasAnimation();
    }
  }

  setCellularStatus(isOnline) {
    this.isCellularOnline = isOnline;
    this.nodes[0].hasCellular = isOnline;

    const pill = document.getElementById('signal-status-pill');
    if (pill) {
      if (isOnline) {
        pill.className = 'pill active-signal';
        pill.innerHTML = '<span class="dot-indicator"></span> 5G Cellular Connected';
      } else {
        pill.className = 'pill mesh-active';
        pill.innerHTML = '<span class="dot-indicator"></span> Mesh Relay Active (Off-Grid)';
      }
    }
  }

  toggleCellular() {
    this.setCellularStatus(!this.isCellularOnline);
    return this.isCellularOnline;
  }

  /**
   * Broadcasts a packet through the network
   */
  sendPacket(packetType, payload) {
    const packet = {
      id: 'pkt_' + Math.floor(Math.random() * 100000),
      timestamp: Date.now(),
      type: packetType, // 'LOCATION', 'SOS', 'VOICE'
      sender: this.nodes[0].name,
      sourceId: this.nodes[0].id,
      hops: 0,
      path: [this.nodes[0].name],
      deliveredToCloud: false,
      payload: payload
    };

    if (this.isCellularOnline) {
      // Direct cellular transmit
      packet.path.push('Cloud Gateway (Direct)');
      packet.deliveredToCloud = true;
      packet.hops = 1;
      this.logPacket(packet, 'Direct Cellular Transmit Succeeded');
    } else {
      // Mesh Hop Relay Simulation: Node 1 -> Node 2 -> Node 3 (Cellular) -> Cloud
      this.logPacket(packet, 'Cellular Lost: Initiating P2P Mesh Hop Relay...');
      
      // Animate hop 1: Self to Dave
      this.triggerPacketAnimation(0, 1, () => {
        packet.hops++;
        packet.path.push(this.nodes[1].name);

        // Animate hop 2: Dave to Maya
        this.triggerPacketAnimation(1, 2, () => {
          packet.hops++;
          packet.path.push(this.nodes[2].name);

          // Maya forwards to Cloud via her cellular connection
          this.triggerPacketAnimation(2, 3, () => {
            packet.hops++;
            packet.path.push('Cell Tower Gateway -> Cloud');
            packet.deliveredToCloud = true;
            this.logPacket(packet, `Relay Complete! Reached Cloud in ${packet.hops} Hops via ${this.nodes[2].name}`);
          });
        });
      });
    }

    return packet;
  }

  triggerPacketAnimation(fromIndex, toIndex, onComplete) {
    const p1 = this.getNodeCanvasPos(fromIndex);
    const p2 = this.getNodeCanvasPos(toIndex);

    this.activePackets.push({
      x: p1.x,
      y: p1.y,
      startX: p1.x,
      startY: p1.y,
      targetX: p2.x,
      targetY: p2.y,
      progress: 0,
      speed: 0.04,
      onComplete
    });
  }

  getNodeCanvasPos(index) {
    if (!this.canvas) return { x: 50, y: 50 };
    const w = this.canvas.width;
    const h = this.canvas.height;
    const positions = [
      { x: w * 0.18, y: h * 0.5 },  // You
      { x: w * 0.42, y: h * 0.3 },  // Dave
      { x: w * 0.68, y: h * 0.65 }, // Maya
      { x: w * 0.88, y: h * 0.35 }  // Gateway
    ];
    return positions[index] || { x: 50, y: 50 };
  }

  logPacket(packet, note) {
    this.packetLog.unshift({
      time: new Date().toLocaleTimeString(),
      id: packet.id,
      type: packet.type,
      hops: packet.hops,
      path: packet.path.join(' ➔ '),
      note: note
    });

    if (this.packetLog.length > 20) this.packetLog.pop();
    this.renderPacketLogUI();
  }

  renderPacketLogUI() {
    const container = document.getElementById('mesh-packet-logs');
    if (!container) return;

    container.innerHTML = this.packetLog.map(log => {
      const typeColor = (log.type === 'SOS' || log.type === 'GUARDIAN_SOS') ? 'var(--danger)' : log.type === 'HAZARD' ? 'var(--warning)' : 'var(--success)';
      return `
        <div style="font-family: var(--font-mono); font-size: 0.78rem; border-bottom: 1px dashed rgba(255,255,255,0.08); padding: 6px 0;">
          <span style="color: var(--primary);">[${log.time}]</span>
          <span style="color: ${typeColor}; font-weight:700;"> [${log.type}]</span>
          <span style="color: var(--text-muted);"> ${log.note}</span>
          <div style="color: var(--text-dim); font-size: 0.72rem; margin-top:2px;">Route: ${log.path}</div>
        </div>
      `;
    }).join('');
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  startCanvasAnimation() {
    const render = () => {
      this.drawTopologyGraph();
      this.animFrame = requestAnimationFrame(render);
    };
    render();
  }

  drawTopologyGraph() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw Background Grid
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.05)';
    ctx.lineWidth = 1;
    const gridGap = 30;
    for (let x = 0; x < w; x += gridGap) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gridGap) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Node Positions
    const pos = [
      this.getNodeCanvasPos(0),
      this.getNodeCanvasPos(1),
      this.getNodeCanvasPos(2),
      this.getNodeCanvasPos(3)
    ];

    // Draw Links
    const links = [
      { from: 0, to: 1, active: true },
      { from: 1, to: 2, active: true },
      { from: 2, to: 3, active: true },
      { from: 0, to: 3, active: this.isCellularOnline }
    ];

    links.forEach(link => {
      const pA = pos[link.from];
      const pB = pos[link.to];
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      if (link.from === 0 && link.to === 3 && !this.isCellularOnline) {
        ctx.strokeStyle = 'rgba(255, 23, 68, 0.2)';
        ctx.setLineDash([5, 5]);
      } else {
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
        ctx.setLineDash([]);
      }
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Update & Draw Packets in Transit
    for (let i = this.activePackets.length - 1; i >= 0; i--) {
      const pkt = this.activePackets[i];
      pkt.progress += pkt.speed;
      pkt.x = pkt.startX + (pkt.targetX - pkt.startX) * pkt.progress;
      pkt.y = pkt.startY + (pkt.targetY - pkt.startY) * pkt.progress;

      ctx.beginPath();
      ctx.arc(pkt.x, pkt.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ff1744';
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (pkt.progress >= 1) {
        if (pkt.onComplete) pkt.onComplete();
        this.activePackets.splice(i, 1);
      }
    }

    // Draw Nodes
    this.nodes.forEach((node, idx) => {
      const p = pos[idx];

      // Outer Pulse Ring
      const time = Date.now() * 0.003;
      const pulseSize = 14 + Math.sin(time + idx) * 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = node.isSelf ? 'rgba(0, 242, 254, 0.15)' : node.isGateway ? 'rgba(127, 0, 255, 0.15)' : 'rgba(0, 230, 118, 0.15)';
      ctx.fill();

      // Node Center Dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = node.isSelf ? '#00f2fe' : node.isGateway ? '#7f00ff' : '#00e676';
      ctx.fill();

      // Label
      ctx.font = '11px Outfit, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, p.x, p.y + 24);

      if (node.hasCellular) {
        ctx.font = '9px Space Grotesk, monospace';
        ctx.fillStyle = '#00e676';
        ctx.fillText('⚡ Cell Signal', p.x, p.y + 35);
      } else if (node.isSelf && !this.isCellularOnline) {
        ctx.font = '9px Space Grotesk, monospace';
        ctx.fillStyle = '#ff9100';
        ctx.fillText('📡 Mesh Node', p.x, p.y + 35);
      }
    });
  }
}

window.MeshNetworkEngine = MeshNetworkEngine;
