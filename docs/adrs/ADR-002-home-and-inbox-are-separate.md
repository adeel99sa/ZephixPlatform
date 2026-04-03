# ADR-002: Home and Inbox Are Separate

## Status
Accepted

## Context
Many SaaS products conflate the landing page with the notification feed, creating a noisy default experience. Zephix needs a clear separation between the personalized operational hub and the updates feed.

## Decision
Home and Inbox are separate destinations with separate routes, separate components, and separate purposes.

- **Home** (`/home`) is the personalized operational landing. It shows role-aware content: workspace overview for users with workspaces, setup guidance for new admins, waiting state for members without workspace access.
- **Inbox** (`/inbox`) is the notifications and updates feed. It shows mentions, task assignments, status changes, and other event-driven content.

## Why
- Home should feel calm and oriented — not overwhelmed by notifications
- Inbox is a triage surface — users go there when they want to process updates
- Conflating them creates a noisy default that degrades first impression
- Separate surfaces allow independent evolution (e.g., Home can add dashboard widgets without affecting notification UX)

## Consequences
- Two separate sidebar items: Home and Inbox
- Two separate routes: `/home` and `/inbox`
- Inbox is behind PaidRoute (not available to Viewer/guest)
- Home content varies by role and workspace state
- No notification badges or counts on the Home page itself