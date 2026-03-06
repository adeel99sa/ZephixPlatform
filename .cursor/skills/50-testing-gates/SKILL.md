Name
testing-gates

Description
Use when adding or repairing unit tests, e2e tests, gating tests, CI checks, and fast pre push commands.

Instructions

Prefer smallest targeted test run first.

Add tests that assert status codes and basic shapes.

For Playwright smoke, verify route mounts and no 500.

Keep tests deterministic. No time sleeps unless required.

Commands

Backend: npm run test:gating

Frontend: npm run test:gating

Targeted: npx jest <spec> --runInBand
