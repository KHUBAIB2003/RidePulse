/**
 * Digital Garage & Maintenance Engine
 * Calculates bike maintenance progress, overdue items, service reminders, bike switcher, and maintenance expense logbook.
 */

class DigitalGarage {
  constructor() {
    this.bikes = [];
    this.activeBike = null;
  }

  init() {
    this.refresh();
  }

  refresh() {
    this.bikes = StorageManager.getGarage();
    this.activeBike = StorageManager.getActiveBike();
    this.renderGarage();
    this.renderActiveBikeSummary();
    this.renderServiceLogbook();
  }

  // Calculate health percentage & status for a maintenance metric
  static calculateItemHealth(currentMileage, lastDoneMileage, intervalKm) {
    const kmDrivenSince = currentMileage - lastDoneMileage;
    const kmRemaining = intervalKm - kmDrivenSince;
    const percentRemaining = Math.max(0, Math.min(100, Math.round((kmRemaining / intervalKm) * 100)));

    let status = 'GOOD';
    let statusClass = 'fill-good';
    if (kmRemaining <= 0) {
      status = 'OVERDUE';
      statusClass = 'fill-danger';
    } else if (percentRemaining <= 20) {
      status = 'DUE SOON';
      statusClass = 'fill-warning';
    }

    return {
      kmDrivenSince,
      kmRemaining,
      percentRemaining,
      status,
      statusClass
    };
  }

  getBikeMaintenanceOverview(bike) {
    const oil = DigitalGarage.calculateItemHealth(bike.currentMileage, bike.lastOilChangeMileage, bike.oilIntervalKm);
    const brakes = DigitalGarage.calculateItemHealth(bike.currentMileage, bike.lastBrakeCheckMileage, bike.brakeIntervalKm);
    const chain = DigitalGarage.calculateItemHealth(bike.currentMileage, bike.lastChainLubeMileage, bike.chainIntervalKm);
    const tires = DigitalGarage.calculateItemHealth(bike.currentMileage, bike.lastTireCheckMileage, bike.tireIntervalKm);

    const items = [
      { name: 'Engine Oil & Filter', icon: 'fa-oil-can', data: oil },
      { name: 'Brake Pads & Fluid', icon: 'fa-triangle-exclamation', data: brakes },
      { name: 'Chain Lubrication / Tension', icon: 'fa-link', data: chain },
      { name: 'Tire Tread & Pressure', icon: 'fa-circle-notch', data: tires }
    ];

    const overdueCount = items.filter(i => i.data.status === 'OVERDUE').length;
    const warningCount = items.filter(i => i.data.status === 'DUE SOON').length;

    return { items, overdueCount, warningCount };
  }

  renderGarage() {
    const container = document.getElementById('garage-bikes-container');
    if (!container) return;

    container.innerHTML = '';

    this.bikes.forEach(bike => {
      const isActive = bike.id === this.activeBike.id;
      const overview = this.getBikeMaintenanceOverview(bike);

      const card = document.createElement('div');
      card.className = `bike-card ${isActive ? 'active-bike' : ''}`;
      card.innerHTML = `
        <div class="bike-card-header">
          <div>
            <div class="bike-name">${bike.make} ${bike.model}</div>
            <div class="bike-model">${bike.year} • Motorbike</div>
          </div>
          ${isActive ? '<span class="bike-badge badge-active"><i class="fa-solid fa-check"></i> Active</span>' : ''}
        </div>

        <div class="bike-mileage">
          <span class="mileage-val">${bike.currentMileage.toLocaleString()}</span>
          <span class="mileage-unit">km total odometer</span>
        </div>

        ${overview.overdueCount > 0 ? `
          <div style="background: rgba(255,23,68,0.15); border: 1px solid rgba(255,23,68,0.3); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; font-size: 0.82rem; color: #ff5252; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>${overview.overdueCount} Service Action(s) Overdue!</span>
          </div>
        ` : ''}

        <div class="maintenance-list">
          ${overview.items.map(item => `
            <div class="maint-item">
              <div class="maint-item-top">
                <span><i class="fa-solid ${item.icon}" style="margin-right: 6px; color: var(--primary);"></i> ${item.name}</span>
                <span class="${item.data.status === 'OVERDUE' ? 'text-danger' : item.data.status === 'DUE SOON' ? 'text-warning' : 'text-muted'}" style="font-weight:600;">
                  ${item.data.status === 'OVERDUE' ? 'OVERDUE (' + Math.abs(item.data.kmRemaining) + ' km over)' : item.data.kmRemaining + ' km left'}
                </span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill ${item.data.statusClass}" style="width: ${item.data.percentRemaining}%;"></div>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="display: flex; gap: 10px; margin-top: 16px;">
          ${!isActive ? `
            <button class="btn btn-secondary" style="flex:1; padding: 8px 12px; font-size:0.85rem;" onclick="digitalGarage.selectActiveBike('${bike.id}')">
              Set Active
            </button>
          ` : ''}
          <button class="btn btn-secondary" style="flex:1; padding: 8px 12px; font-size:0.85rem;" onclick="digitalGarage.markServicedModal('${bike.id}')">
            <i class="fa-solid fa-wrench"></i> Reset Service
          </button>
        </div>
      `;

      container.appendChild(card);
    });
  }

  renderActiveBikeSummary() {
    const summaryBadge = document.getElementById('active-bike-summary-badge');
    if (summaryBadge && this.activeBike) {
      const overview = this.getBikeMaintenanceOverview(this.activeBike);
      summaryBadge.innerHTML = `
        <i class="fa-solid fa-motorcycle" style="color: var(--primary);"></i>
        <span><strong>${this.activeBike.make} ${this.activeBike.model}</strong> (${this.activeBike.currentMileage.toLocaleString()} km)</span>
        ${overview.overdueCount > 0 ? `<span style="background:var(--danger); color:#fff; padding:2px 6px; border-radius:10px; font-size:0.7rem;">${overview.overdueCount} Overdue</span>` : ''}
      `;
    }
  }

  renderServiceLogbook() {
    const container = document.getElementById('service-logbook-table-body');
    const totalCostEl = document.getElementById('garage-total-service-cost');
    const costPerKmEl = document.getElementById('garage-cost-per-km');
    if (!container) return;

    const logs = StorageManager.getServiceLogs();
    const activeBikeLogs = logs.filter(l => l.bikeId === this.activeBike.id);
    const totalSpent = activeBikeLogs.reduce((acc, curr) => acc + (curr.cost || 0), 0);
    const costPerKm = this.activeBike.currentMileage > 0 ? (totalSpent / this.activeBike.currentMileage).toFixed(3) : '0.00';

    if (totalCostEl) totalCostEl.innerText = `$${totalSpent.toLocaleString()}`;
    if (costPerKmEl) costPerKmEl.innerText = `$${costPerKm}/km`;

    if (activeBikeLogs.length === 0) {
      container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">No maintenance expenses logged yet.</td></tr>`;
      return;
    }

    container.innerHTML = activeBikeLogs.map(log => `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
        <td style="padding:10px; color:var(--text-muted); font-size:0.85rem;">${log.date}</td>
        <td style="padding:10px; font-weight:600; font-size:0.9rem;">${log.type}</td>
        <td style="padding:10px; font-family:var(--font-mono); font-size:0.85rem;">${log.mileage.toLocaleString()} km</td>
        <td style="padding:10px; font-weight:700; color:var(--success); font-size:0.9rem;">$${log.cost}</td>
        <td style="padding:10px; color:var(--text-dim); font-size:0.8rem;">${log.notes || '-'}</td>
      </tr>
    `).join('');
  }

  addServiceExpense(type, cost, mileage, notes) {
    const log = {
      id: 'srv_' + Date.now(),
      bikeId: this.activeBike.id,
      bikeName: `${this.activeBike.make} ${this.activeBike.model}`,
      type,
      cost: parseFloat(cost),
      mileage: parseFloat(mileage),
      date: new Date().toISOString().split('T')[0],
      notes
    };

    StorageManager.saveServiceLog(log);
    this.refresh();

    if (window.soundEngine) window.soundEngine.playChime();
    if (window.app) window.app.showNotification(`Added $${cost} service log for ${type}!`, 'success');
  }

  selectActiveBike(bikeId) {
    StorageManager.setActiveBikeId(bikeId);
    this.refresh();
  }

  markServicedModal(bikeId) {
    const bike = this.bikes.find(b => b.id === bikeId);
    if (!bike) return;

    bike.lastOilChangeMileage = bike.currentMileage;
    bike.lastBrakeCheckMileage = bike.currentMileage;
    bike.lastChainLubeMileage = bike.currentMileage;
    bike.lastTireCheckMileage = bike.currentMileage;

    StorageManager.saveGarage(this.bikes);
    this.refresh();
    
    if (window.soundEngine) window.soundEngine.playChime();
    if (window.app) {
      window.app.showNotification(`Service recorded for ${bike.make} ${bike.model}! Mileage reset to current (${bike.currentMileage} km).`, 'success');
    }
  }

  addNewBike(make, model, year, currentMileage) {
    const bike = StorageManager.addBike({
      make,
      model,
      year: parseInt(year),
      currentMileage: parseFloat(currentMileage),
      lastOilChangeMileage: parseFloat(currentMileage),
      oilIntervalKm: 4000,
      lastBrakeCheckMileage: parseFloat(currentMileage),
      brakeIntervalKm: 3000,
      lastChainLubeMileage: parseFloat(currentMileage),
      chainIntervalKm: 500,
      lastTireCheckMileage: parseFloat(currentMileage),
      tireIntervalKm: 5000,
      notes: 'Added via Digital Garage'
    });

    this.refresh();
    return bike;
  }
}

window.DigitalGarage = DigitalGarage;
