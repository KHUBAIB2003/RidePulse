# 🏍️ RidePulse v2.0 — Motorcycle Telemetry & Safety Platform

> Production-quality, cross-platform motorcycle riding companion platform with real-time GPS tracking, Digital Garage maintenance scheduler, community hazard reporting, off-grid mesh network routing, automated Guardian safety check-ins, and emergency SOS dispatch.

---

## 🏗️ Monorepo Workspace Structure

```
.
├── ridepulse_backend/      # Node.js LTS, Express.js, TypeScript, Socket.IO, MongoDB API Engine
├── ridepulse_mobile/       # Flutter Android & iOS Cross-Platform Mobile Application
├── ridepulse_web/          # Flutter Web & Responsive Web Dashboard Application
├── ridepulse_admin/        # Enterprise Admin Portal Dashboard
├── .github/workflows/      # GitHub Actions CI/CD Pipeline Definitions
└── README.md               # Monorepo Documentation Master
```

---

## 🛠️ Free Technology Stack (₹0 Budget Protocol)

- **Mobile App**: Flutter (Latest Stable) for Android & iOS
- **Web App**: Flutter Web & Responsive Web
- **Backend**: Node.js LTS + Express.js + TypeScript
- **Database**: MongoDB Atlas Free Tier (M0 Shared - 512MB Auto-Indexed Storage)
- **Real-Time**: Socket.IO Engine
- **Auth**: Stateless JWT + bcrypt (Salt rounds = 12)
- **Maps**: OpenStreetMap Tiles + `flutter_map` SDK
- **Routing**: OSRM (Open Source Routing Machine) API
- **Geocoding**: Nominatim OpenStreetMap API
- **Push Notifications**: Firebase Cloud Messaging (FCM Free Tier)
- **Media Store**: Cloudinary Free Tier (25GB Free Storage)
- **Hosting**: Render Free Tier (Backend API) & Vercel / GitHub Pages (Web Frontend)

---

## 🚀 Quick Start Guide

### 1. Backend Setup (`ridepulse_backend/`)
```bash
cd ridepulse_backend
npm install
cp .env.example .env
npm run dev
```

### 2. Mobile Setup (`ridepulse_mobile/`)
```bash
cd ridepulse_mobile
flutter pub get
flutter run
```

---

## 📄 Documentation Reference
- Architecture Specification: [RidePulse_v2_Enterprise_Architecture.md](file:///C:/Users/dell/.gemini/antigravity-ide/brain/fa51954f-342a-434f-b071-edf7d6ad6db7/RidePulse_v2_Enterprise_Architecture.md)
- Development Roadmap: 100 Implementation Tasks (Days 1–100)

---
*RidePulse v2.0 — Open Source Motorcycle Platform*
