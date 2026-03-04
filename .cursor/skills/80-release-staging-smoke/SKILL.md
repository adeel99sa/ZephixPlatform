Name
release-staging-smoke

Description
Use for staging validation, signup flow, email verification behavior, health checks, and release smoke scripts.

Instructions

Always validate /api/health/ready and /api/version.

For signup flow, verify cookie session and /auth/me.

Collect evidence bundle under docs or scripts proofs only when requested.

Never change production behavior to satisfy tests. Fix the tests or harness first.
