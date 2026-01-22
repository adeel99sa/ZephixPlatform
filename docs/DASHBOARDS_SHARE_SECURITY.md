# Dashboards Share Security

This document describes the security posture for public dashboard shares.

## Share Read Behavior
- Public share reads return a constrained DTO (no `organizationId`, `ownerUserId`, `deletedAt`, or audit fields).
- Widget config is sanitized via per-widget allowlists and defaults to `{}` when no safe fields exist.
- Share tokens are validated with constant-time comparison and must be enabled and unexpired.

## Client Expectations
- The public share payload includes only `id`, `name`, optional `description`, optional `visibility`, and `widgets` with layout.
- UI in share mode should not assume workspace membership or authenticated data access.
