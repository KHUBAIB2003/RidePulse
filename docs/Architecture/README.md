# 🏗️ RidePulse Enterprise Architecture Specifications

This directory contains system architecture specifications, design patterns, microservices breakdown, and layer separation documentation for RidePulse v2.0.

## Documents

- [Software Architecture Document (SAD)](../../C:/Users/dell/.gemini/antigravity-ide/brain/fa51954f-342a-434f-b071-edf7d6ad6db7/RidePulse_Software_Architecture_Document.md)
- [Enterprise System Architecture](../../C:/Users/dell/.gemini/antigravity-ide/brain/fa51954f-342a-434f-b071-edf7d6ad6db7/RidePulse_v2_Enterprise_Architecture.md)

## Core Architectural Pillars

1. **High Scalability**: Scalable to 100,000+ active motorcycle riders.
2. **Zero Paid APIs Policy (₹0 Infrastructure)**: Powered by Node.js, TypeScript, OpenStreetMap, OSRM, Turf.js, MongoDB 2dsphere, and WebSockets.
3. **Decoupled Controller-Service-Repository Pattern**: Clean separation of concerns.
4. **Real-time Telemetry & SOS Engine**: Low-latency Socket.IO streaming with fallback REST sync.
