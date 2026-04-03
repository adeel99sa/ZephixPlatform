# Architecture Decision Records

This directory contains the locked architecture decisions for the Zephix platform.

ADRs document permanent platform choices that must not be reopened without explicit founder approval. They are referenced by `CLAUDE.md`, skill files, and operating model docs.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [001](ADR-001-workspace-is-the-container.md) | Workspace Is the Container | Accepted |
| [002](ADR-002-home-and-inbox-are-separate.md) | Home and Inbox Are Separate | Accepted |
| [003](ADR-003-administration-in-admin-profile-menu.md) | Administration in Admin Profile Menu | Accepted |
| [004](ADR-004-project-creation-is-template-first.md) | Project Creation Is Template-First | Accepted |
| [005](ADR-005-ai-is-advisory-only.md) | AI Is Advisory Only | Accepted |
| [006](ADR-006-dashboard-publishing-model.md) | Dashboard Publishing Model | Accepted |
| [007](ADR-007-governed-mutation-pattern.md) | Governed Mutation Pattern | Accepted |

## How to Use

- Before any architecture-sensitive work, check relevant ADRs.
- ADRs are permanent unless explicitly superseded by a new ADR with founder approval.
- If current implementation drifts from an ADR, the ADR is still the target — drift is noted, not accepted.