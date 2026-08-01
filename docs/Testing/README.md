# 🧪 RidePulse QA, Testing & Quality Gate Strategy

This directory contains integration test specifications, performance benchmarks, and Quality Gate policies.

## Quality Gate Execution

To run the complete Quality Gate pipeline:

```bash
cd ridepulse_backend
npx tsc --noEmit
npx eslint src
npm test
npm run build
npm audit
```

## Test Suites

- **`tests/integration/health.test.ts`**: Verifies system telemetry and `/health` response.
- **`tests/integration/auth_profile.test.ts`**: Verifies user registration, login, JWT rotation, and profile updates.
- **`tests/integration/garage.test.ts`**: Verifies motorcycle CRUD, default vehicle toggling, fuel fill economy calculations, and fleet stats.
