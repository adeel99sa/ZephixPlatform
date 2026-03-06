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

Collect evidence bundle under docs or scripts proofs only when requested.

Never change production behavior to satisfy tests. Fix the tests or harness first.
