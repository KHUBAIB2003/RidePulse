# 📡 RidePulse OpenAPI 3.0 & REST API Documentation

This directory contains Swagger / OpenAPI 3.0 specifications, route definitions, and request/response payloads for RidePulse v2.0.

## Interactive API Docs

When running the backend server locally (`npm run dev`), interactive Swagger documentation is available at:
- **Web UI**: `http://localhost:5000/api/docs`
- **JSON Spec**: `http://localhost:5000/api/docs.json`

## API Modules Overview

- `/api/v1/auth`: Authentication, Registration, JWT Token Rotation, Password Recovery
- `/api/v1/profile`: User Profiles, Rider Preferences, Emergency Contacts
- `/api/v1/bikes`: Digital Garage, Maintenance Schedules, Fuel Logs, Expense Tracking
- `/api/v1/rides`: Telemetry Tracking, Route Recording, GPX Import/Export (Task 5)
- `/api/v1/sos`: Emergency Signal Broadcast, Crash Alerts, Guardian Pings (Task 6)
