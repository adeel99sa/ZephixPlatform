# Legacy landing (non-canonical, pre–V3)

**Canonical landing** is V3 (`src/components/landing/v3/`, wired from `src/pages/LandingPage.tsx`).  
This folder holds older marketing sections (e.g. Features, How it works, Pricing, Hero) kept for reference — **not** the default `/` experience.

- **Do not** import into the active app shell without an explicit product decision.
- **Tests:** `legacy/__tests__/` — excluded from default `vitest` runs (`vitest.config.ts` excludes `src/components/landing/legacy/**`).
- **Active landing tests:** `npm run test:landing` (V3 only).
- **Legacy tests (opt-in):** `npm run test:landing:legacy`.
