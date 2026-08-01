# 📐 RidePulse Unified Modeling Language (UML) Diagrams

This directory contains class diagrams, component diagrams, state machine diagrams, and system deployment architecture diagrams.

## System Class Diagram

```mermaid
classDiagram
    class User {
        +ObjectId id
        +String email
        +String callsign
        +String passwordHash
        +String role
        +calculateProfileCompleteness()
    }

    class Bike {
        +ObjectId id
        +ObjectId userId
        +String make
        +String bikeModel
        +Number odometerKm
        +Number averageMileageKmpl
        +Boolean isDefault
        +calculateHealthScore()
    }

    class FuelLog {
        +ObjectId id
        +ObjectId bikeId
        +Number fuelLiters
        +Number totalCost
        +Number calculatedKmpl
    }

    class MaintenanceLog {
        +ObjectId id
        +ObjectId bikeId
        +String category
        +Number cost
        +Date serviceDate
    }

    User "1" -- "*" Bike : owns
    Bike "1" -- "*" FuelLog : records
    Bike "1" -- "*" MaintenanceLog : logs
```
