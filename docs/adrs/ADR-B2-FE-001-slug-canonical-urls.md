# ADR-B2-FE-001 — Slug-canonical user-facing URLs

## Context

Workspace URLs historically mixed numeric/string IDs (`/workspaces/:id/...`) with slug routes (`/w/:slug/...`). Industry collaboration tools favor stable, human-readable paths for sharing and support.

## Decision

User-facing navigation uses **`/w/:slug/...`**. API tenancy continues to use **`x-workspace-id`** (active workspace id from client store) — unchanged.

## Consequences

- Shareable, readable URLs.
- Slug uniqueness remains a backend concern (org-scoped unique constraint).
- A migration period keeps ID routes redirecting until removal (PR3).

## Status

Accepted — Build 2 frontend PR1–PR3.
