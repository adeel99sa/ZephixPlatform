# ADR-B2-FE-002 — Universal `/inbox` landing post-login

## Context

Defaulting users into a single workspace home caused confusion for multi-workspace members and blurred **Home** vs **Inbox** product semantics.

## Decision

After successful authentication, users navigate to **`/inbox`** unless a safe same-origin **`returnUrl`** query parameter is provided. Workspace home (`/w/:slug/home`) is an explicit destination.

## Consequences

- Consistent landing across roles.
- Extra navigation step for single-workspace users who prefer workspace home (acceptable tradeoff).

## Status

Accepted — Build 2 frontend.
