Name
release-staging-smoke

Description
Use for staging validation, signup flow, email verification behavior, health checks, and release smoke scripts.

Instructions

Always validate /api/health/ready and /api/version.

Always use scripts/smoke/staging-onboarding.sh for staging proof.

Never paste Railway domains into docs outside docs/ai/environments.

When a domain changes, update docs/ai/environments/staging.env and rerun:
scripts/smoke/sync-staging-env.sh, then scripts/smoke/staging-onboarding.sh.

For signup flow, verify cookie session and /auth/me.

## Frontend Stage 2 — asset-hash precheck (mandatory)

Before any Stage 2 browser states against staging FE:

1. `curl` the live FE HTML → resolve `/assets/index-*.js`.
2. Confirm that bundle contains the strings under test (feature-specific).
3. Record the asset hash in the Stage 2 report.
4. Only then prove UI states (clean org preferred; delete to zero).

Invalid: local Vite, wrong branch, or live hash without the strings. Deploy FE from monorepo root — `zephix-frontend/DEPLOY.md`.

Collect evidence bundle under docs or scripts proofs only when requested.

Never change production behavior to satisfy tests. Fix the tests or harness first.
