# ADR-003: Administration in Admin Profile Menu

## Status
Accepted

## Context
Administration (org settings, user management, billing, audit logs) needs a stable access point that does not pollute the work-focused left navigation. The sidebar should remain oriented toward daily execution — not org-level control.

## Decision
Administration is accessed from the Admin user profile menu. It must not appear in the left navigation sidebar.

- The sidebar is work-focused: Home, Inbox, My Work, Workspaces, Dashboards, Templates, Settings.
- Administration (`/administration`) is gated to Admin role only via `RequireAdminInline`.
- The canonical entry point is the profile menu, visible only to Admin users.

## Why
- Left nav is for daily work. Administration is infrequent.
- Mixing admin controls into the work sidebar creates role confusion for Members and Viewers.
- Profile menu is the standard SaaS pattern for account-level and org-level controls.
- Keeps the sidebar clean and consistent across all roles.

## Consequences
- No "Administration" item in the sidebar navigation
- Profile menu must include an "Administration" link for Admin users
- Admin-only pages still exist at `/administration/*` routes
- Any shell or navigation work must preserve this boundary

## Current Implementation Notes
- Administration is currently reachable through Home-page admin action links in some flows.
- This is transitional implementation drift, not the target architecture.
- Future shell or admin-access work must converge to the profile-menu model and retire Home-link-only admin entry.