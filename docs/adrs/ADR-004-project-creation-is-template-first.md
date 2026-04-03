# ADR-004: Project Creation Is Template-First

## Status
Accepted

## Context
Early development created multiple project creation entry points (direct create, modal create, inline create, template instantiate). This led to duplicate surfaces, inconsistent project structure, and governance bypass.

## Decision
Project creation converges to one canonical template-first flow. All entry points lead to the template center, where the user selects a template and instantiates it.

- **Canonical path**: `/templates` → TemplateCenterPage → InstantiateTemplateModal → `POST /templates/:id/instantiate-v5_1`
- **Workspace-bound**: project creation always happens inside a workspace
- **Template creates structure**: backend creates real WorkPhase + WorkTask from template snapshot

## Why
- Templates carry governance defaults (phases, gates, policies)
- One path means one place to enforce validation, policy, and audit
- Eliminates duplicate creation surfaces that accumulate over time
- Ensures every project starts with a governed structure, not an empty shell

## Consequences
- All project creation UIs must route through the template flow
- Duplicate creation surfaces (direct create modals, inline create buttons) must be retired
- Backend instantiation endpoint is the single write path
- Empty projects (no template) are not supported as a first-class flow
- Template catalog must be maintained as a product surface

## What This Does Not Decide
- Whether "blank template" is offered as a template option
- Whether templates can be cloned or forked
- Template versioning strategy