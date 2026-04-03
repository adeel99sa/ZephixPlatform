# ADR-001: Workspace Is the Container

## Status
Accepted

## Context
Zephix needs a clear organizational unit that scopes all domain work. Without a defined container, projects, tasks, dashboards, and risks risk floating at the org level with unclear ownership and access boundaries.

## Decision
Workspace is the operational container. All domain work — projects, tasks, dashboards, risks, resources — lives inside a workspace. There is no floating org-level project creation.

## Why
- Clear access boundary for team-based work
- Enables workspace-level governance, policies, and templates
- Prevents cross-team data leakage
- Simplifies permission model: workspace role determines access

## Consequences
- All domain endpoints require workspace context (`x-workspace-id` header)
- Project creation must happen inside a workspace
- Dashboard publishing scopes to a workspace
- Empty-state UX must guide users to workspace selection before domain pages
- `RequireWorkspace` guard enforces this on workspace-scoped routes

## What This Does Not Decide
- Whether workspaces can be nested or grouped
- Whether cross-workspace views exist at the org level
- How many workspaces an org can have (plan-based limit)