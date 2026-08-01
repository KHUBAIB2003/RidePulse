# 🗄️ RidePulse Database Schema & ERD Specifications

This directory contains database schemas, indexing strategies, aggregate pipelines, and ERD diagrams for MongoDB.

## Primary Collections

1. **`users`**: Rider identity, credentials, callsign, preferences, emergency contacts.
2. **`bikes`**: Motorcycle specifications, telemetry, document expirations, health score.
3. **`maintenancelogs`**: Service records, costs, next service due date/mileage.
4. **`fuellogs`**: Fuel fills, price per liter, auto-computed `calculatedKmpl`.
5. **`expenses`**: Consolidated motorcycle financial transactions.
6. **`reminders`**: Service & document expiration reminders.
7. **`refreshtokens`**: Hashed JWT refresh tokens with automatic revocation rotation.
8. **`activitylogs`**: Audit trail of user security & system events.
9. **`sessions`**: Device active session management.
10. **`ridelogs`**: GeoJSON LineString route trajectories and telemetry points.
11. **`hazards`**: Community safety hazard reports with GeoJSON 2dsphere spatial index.

## Spatial Indexing Strategy

- **`2dsphere` Index**: Applied to `location` (`[longitude, latitude]`) on `ridelogs`, `hazards`, and `sos_alerts` for high-performance `$nearSphere` and `$geoWithin` queries.
