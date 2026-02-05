# Zephix Master Plan

> **Source of Truth** for platform vision, MVP sequence, and post-MVP roadmap.

**Status**: LOCKED  
**Last Updated**: 2026-02-04

---

## Vision

Zephix is an advanced, multi-tenant project management platform that adapts to customer processes and workflows while staying stable in production.

**Core differentiators**:
1. Workspace-first architecture with enforced structure
2. Template-driven project creation (not ad-hoc)
3. Governance-first design with role-based access
4. Resource allocation as a core engine (not a feature)

---

## Principles

1. **Workspace-first rule**
   - A project must belong to a workspace
   - Only admins create workspaces
   - Projects created only through Template Center

2. **Enforced structure**
   - No random "New project" buttons
   - Templates define project structure
   - Status transitions enforced on work tasks

3. **Multi-tenant isolation**
   - All data scoped by organizationId
   - Workspace-scoped endpoints enforce workspaceId
   - platformRole is source of truth

4. **No patchy fixes**
   - Fix patterns, not symptoms
   - Look for root cause
   - Keep changes small and coherent

---

## Now, Next, Later

| Phase | Focus | Status |
|-------|-------|--------|
| **NOW: MVP** | Auth, Governance, Templates, Resources, Security | 🚧 In Progress |
| **NEXT: Hardening** | Template versioning, KPI packs, Dashboard builder | 📋 Planned |
| **LATER: AI Layer** | Document processing, Project generation, Insights | 📋 Planned |

---

## MVP Execution Sequence

### Week 1
| Day | Sprint | Goal |
|-----|--------|------|
| 1-2 | Sprint 1: Auth | Cookie flow, role homes |
| 3-5 | Sprint 2: Governance | Workspace creation, workspace home, health snapshot |

### Week 2
| Day | Sprint | Goal |
|-----|--------|------|
| 1-3 | Sprint 3: Templates | Template Center, instantiation |
| 4-5 | Sprint 4: Resources | Allocation calculations, utilization |
| 6-7 | Sprint 5: Security | Access control, negative tests |

---

## Sprint Dependencies

```
Sprint 1 (Auth)
    │
    └──> Sprint 2 (Governance)
              │
              └──> Sprint 3 (Templates)
                        │
                        └──> Sprint 4 (Resources)
                                  │
                                  └──> Sprint 5 (Security)
```

- **Auth → Governance**: Role-based routing needed for workspace access
- **Governance → Templates**: Workspace context needed for project creation
- **Templates → Resources**: Projects needed for resource allocation
- **Resources → Security**: Resource access needs security enforcement

---

## Post-MVP Sequence

### Phase 2: Configuration Layer
- Custom fields per organization and workspace
- Workflow configuration for work items
- Saved views (filters, sorting, columns)
- Template packs per industry

### Phase 3: Automation
- Domain events for important actions
- Workspace rules (when/then automation)
- Outbound integrations (webhooks, notifications)

### Phase 4: AI Layer
- BRD to project template generation
- AI insights (at-risk projects, bottlenecks)
- All AI output through standard services

---

## Risks

| Risk | Mitigation |
|------|------------|
| Scope creep | Locked MVP scope, explicit deferral list |
| Data leakage | Security sprint with negative tests |
| Template complexity | MVP uses simple templates, versioning deferred |
| Performance | Pagination enforced, no N+1 queries |

---

## Dependencies

| Dependency | Owner | Status |
|------------|-------|--------|
| Railway deployment | Ops | ✅ Ready |
| PostgreSQL | Ops | ✅ Ready |
| JWT auth | Backend | ✅ Implemented |
| Template data | Backend | 🚧 Seeding needed |

---

## Core Business Rules (Locked)

1. **Execution entity**: WorkTask is the single execution entity for MVP
2. **Status transitions**: BACKLOG → TODO → IN_PROGRESS → IN_REVIEW → DONE
3. **Terminal states**: DONE, CANCELED (no transitions allowed)
4. **Rollups**: Health = BLOCKED if any blocked/overdue, AT_RISK if any at risk, HEALTHY otherwise
5. **Notifications**: 3 core events only (TASK_ASSIGNED, STATUS_CHANGED, COMMENT_ADDED)

---

## Source Notes

Extracted from:
- `docs/MVP/00_decisions.txt`
- `docs/MVP/04_implementation_plan.txt`

*Created: 2026-02-04*
