# 🔄 RidePulse Sequence Diagrams

This directory contains interaction sequence diagrams for key user workflows, authentication, digital garage operations, SOS triggering, and real-time mesh networking.

## Fuel Fill & Economy Calculation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Rider
    participant MobileApp as Flutter App
    participant API as Express Gateway
    participant Auth as Auth Middleware
    participant Service as Garage Service
    participant DB as MongoDB

    Rider->>MobileApp: Input Fuel Fill (Liters: 14, Odometer: 2750, Cost: ₹1400)
    MobileApp->>API: POST /api/v1/bikes/:id/fuel (Bearer JWT)
    API->>Auth: Authenticate JWT Token
    Auth-->>API: Valid Token (userId: 123)
    API->>Service: addFuelLog(bikeId, userId, input)
    Service->>DB: Query Previous FuelLog (Odometer: 2500)
    DB-->>Service: Previous Log Found
    Service->>Service: Calculate Distance (250 km) & Economy (17.86 Kmpl)
    Service->>DB: Save FuelLog, Expense & Update Bike.averageMileageKmpl
    DB-->>Service: Transaction Confirmed
    Service-->>API: FuelLog Object
    API-->>MobileApp: 201 Created (Kmpl: 17.86)
    MobileApp-->>Rider: Display Updated Average Kmpl & Fuel Log
```
