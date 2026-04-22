# ADR-006: Dashboard Publishing Model

## Status
Accepted

## Context
Dashboards in Zephix serve two purposes: personal workspace views and shared communication surfaces. The platform needs a publishing model that separates draft/private dashboards from published ones, with governed audience targeting.

## Decision
Dashboards follow a private-to-published lifecycle with governed audience targeting and backend-enforced publishing.

- **Private**: default state. Dashboard is visible only to its creator.
- **Published**: dashboard is discoverable by targeted audience roles within the workspace.
- **Audience**: JSONB array of platform roles (e.g., `["ADMIN", "MEMBER"]`). Queried with `@>` containment.
- **Default**: one default dashboard per workspace. Setting a new default auto-clears the previous one.
- **Admin-only**: publish, unpublish, and audience mutations are restricted to Admin role on the backend.

## Why
- Publishing is a communication act — it should be intentional, not automatic
- Audience targeting prevents information overload (Viewers don't need Admin dashboards)
- Backend enforcement prevents privilege escalation (Members cannot publish)
- Default dashboard provides a consistent landing for each workspace
- JSONB audience enables flexible role combinations without schema changes

## Consequences
- Dashboard entity has `isPublished`, `audience`, `isDefault`, `publishedAt`, `publishedByUserId` fields
- Discovery endpoint (`GET /dashboards/published/workspace/:wsId`) filters by caller's role
- Frontend shows publish/unpublish controls only to Admin users
- Unpublishing clears audience and removes from discovery
- Dashboard CRUD remains available to all workspace members (create/edit is not publishing)

## What This Does Not Decide
- Whether dashboards can be shared outside the organization
- Whether dashboard templates exist as a separate concept
- Dashboard card catalog or KPI toggle specifics