# Engine 1 — Identity & Access (Frontend RBAC Surface)

**Status:** Living architecture note — frontend-heavy view (server authority documented separately).  
**Classification:** Engineering reference — no secrets, credentials, or customer data.  
**Blueprint alignment:** Tier 1 — Engine 1 (Identity & Access).

---

## 1.1 — Purpose & Scope

Engine 1 governs **who may act** and **within which scope** (organization, workspace, project) across the Zephix product. On the **frontend**, Engine 1 is expressed as **canonical role helpers**, **hooks**, and **lint enforcement** so UI routing and affordances align with the backend matrix without scattering string literals.

**Engine 1 does not:**

- Replace API authorization (NestJS guards and tenancy checks remain authoritative; see [RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md](../RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md)).
- Define billing entitlements or subscription SKUs (Stripe-style entitlements are a separate concern; UI may reflect them but must not invent permissions).
- Implement audit persistence (Foundation F-A); emitting audit events for RBAC mutations is a **known gap** documented below.

**Boundaries:**

| Adjacent engine / foundation | Relationship |
|------------------------------|--------------|
| Engine 2 (Tenancy) | Workspace membership and `organizationId` scope upstream of role helpers. |
| Engine 4 (Templates) | Template publish/edit gates consume workspace + platform helpers. |
| Engine 5 (Governance) | Phase gates and policies enforced server-side; UI mirrors capability flags. |
| F-E (Admin Console) | Administration surfaces consume the same canonical helpers + Rule A guarded paths. |

---

## 1.2 — Architectural Decisions (Retrospective ADRs)

### ADR-Engine-1-001 — Canonical helper hierarchy (Platform / Org / Workspace / Project)

| Field | Content |
|-------|---------|
| **Status** | Accepted (retroactive; reflects merged Phase 1–2 work). |
| **Context** | Raw `user.role === '…'` and workspace string compares drifted across dozens of files; JWT and legacy directory APIs emit heterogeneous strings (`ADMIN`, `admin`, `workspace_owner`, etc.). |
| **Decision** | Centralize checks in `zephix-frontend/src/utils/access.ts` and `zephix-frontend/src/utils/roles.ts` with a **layered** model: platform (`isPlatformAdmin`, `platformRoleFromUser`, `normalizePlatformRole`, `PLATFORM_ROLE`), workspace membership helpers, project hooks (`useProjectPermissions`), and legacy org-directory predicates (`LEGACY_ORG_ROLE`, `isLegacyOrgDirectoryOwner`). |
| **Consequences** | (+) One compositional pattern for migrations; (+) docs in [RBAC-CANONICAL-HELPERS.md](../../../zephix-frontend/src/utils/RBAC-CANONICAL-HELPERS.md). (−) Consumers must prefer helpers over re-deriving strings; residual `isAdminUser` deprecated path remains until removed. |

### ADR-Engine-1-002 — Lint Rule A (ban raw role string equality)

| Field | Content |
|-------|---------|
| **Status** | Accepted (retroactive); extended post-evaluation cycle for administration plural path. |
| **Context** | High-risk UI paths reintroduced string compares; directory naming (`features/admin` vs `features/administration`) created a **silent coverage gap** (Lesson #28). |
| **Decision** | ESLint **`no-restricted-syntax`** at **error** severity for fixed patterns (`*.role === '<literal>'` for platform and workspace literals) on **five** glob targets: `**/src/features/admin/**/*.{ts,tsx}`, `**/src/features/administration/**/*.{ts,tsx}`, `**/src/features/workspaces/**/*.{ts,tsx}`, `**/src/pages/auth/**/*.{ts,tsx}`, `**/src/App.tsx`. **Rule B** (`no-restricted-properties` on `user.role`) remains **warn**. Selectors unchanged when extending paths. |
| **Consequences** | (+) CI and local ESLint catch regressions early; (+) Vitest stdin fixtures in `rbac-lint-rules.test.ts`. (−) Further directories require explicit dispatch to extend Rule A. |

### ADR-Engine-1-003 — `isPlatformAdmin` canonical vs `isAdminUser`

| Field | Content |
|-------|---------|
| **Status** | Accepted (retroactive). |
| **Context** | Multiple admin semantics (`isAdminUser`, `isPlatformAdmin`, inline route guards) competed; PO/architect locked platform admin clarity. |
| **Decision** | **`isPlatformAdmin`** is canonical for org-wide admin capability derived from normalized platform role; **`isAdminUser`** retained only for backward compatibility and eventual removal. |
| **Consequences** | (+) Clear matrix alignment with backend `PlatformRole`; (−) deletion gated on zero consumers (tracked debt). |

### ADR-Engine-1-004 — `createRolesAccessMocks` shared test infrastructure

| Field | Content |
|-------|---------|
| **Status** | Accepted (retroactive). |
| **Context** | Phase 1 migrations hit **HALT-FED1-7**-class mock ordering issues (`vi.hoisted` vs static imports). |
| **Decision** | Provide **`createRolesAccessMocks`** / **`resetRolesAccessMocks`** in `zephix-frontend/src/utils/__tests__/roles.test-mock.ts` with JSDoc on ESM/Vitest hoisting; typed `vi.fn` shapes for stable helper tests. |
| **Consequences** | (+) Reuse across component suites (e.g. `TaskListSection.restore.test.tsx`); (−) contributors must follow documented hoisting pattern. |

---

## 1.3 — Current Implementation State

| Theme | State |
|-------|--------|
| **Canonical helpers** | Implemented under `zephix-frontend/src/utils/access.ts`, `roles.ts`; inventory in [RBAC-CANONICAL-HELPERS.md](../../../zephix-frontend/src/utils/RBAC-CANONICAL-HELPERS.md). |
| **Migrated callsites** | ~**28+** lower-risk files (Phase 2) plus Phase 1 high-risk set; cumulative **32+** referenced in evaluation cycle closure docs — see [WS-AF-FE-D-P2-PHASE2-COMPLETION.md](../WS-AF-FE-D-P2-PHASE2-COMPLETION.md). |
| **Lint Rule A** | **Five** directory/file patterns (admin, **administration**, workspaces, `pages/auth`, `App.tsx`) — lineage: PR #265 (establishment), PR #267 (Phase 2 migrations), PR #268 (administration extension). |
| **Mocks & tests** | `createRolesAccessMocks`, `rbac-lint-rules.test.ts`, `rbac-canonical-helpers.test.ts`, `access.test.ts`, `roles.test.ts`; parity guards (e.g. `TemplateCenterPage.can-publish.test.tsx`). |
| **HALT discipline** | Frontend test baseline **HALT-FED2-1** operated during Phase 2 batches (failed tests capped). |

---

## 1.4 — Integration Patterns

| Integration | Pattern |
|-------------|---------|
| **E1 ↔ E2** | Workspace permission hooks (`useWorkspacePermissions`, `useWorkspaceRole`) consume normalized roles; store derivations use `isWorkspaceStoreReadOnlyRole` / `isWorkspaceStoreWriterRole` (see Phase 2 completion doc). |
| **E1 ↔ E4** | Template Center and template routes gate on platform + workspace helpers; explicit **ARCHITECT NOTE** on deferred publish-policy canonicalization remains on selected pages. |
| **E1 ↔ E5** | Governance UI reflects server decisions; client does not enforce gate outcomes. |
| **E1 ↔ F-A** | **Gap:** RBAC mutations should emit audit events server-side; not covered by this frontend engine doc — tracked as debt. |
| **E1 ↔ F-E** | Administration layout and security tabs use canonical helpers; Rule A now includes `features/administration/**`. |

---

## 1.5 — Practitioner discipline, competitive positioning & Zephix differentiation

### 1.5.1 What discipline requires

Governed B2B program and portfolio management needs **multi-tier access control** that mirrors organizational reality: **platform** membership (org), **workspace** membership, and **project** / delivery assignments are different axes—not interchangeable labels. Practitioner discipline (e.g. clarity of **accountable vs responsible** ownership, RACI-style separation of duties) maps naturally to **explicit roles and helpers**, not ad hoc string checks in UI code.

**Operational requirement:** treat **permission drift** as delivery risk. Centralizing “who may act” into shared helpers and automated enforcement is how teams keep RBAC aligned with the server matrix as JWT payloads, legacy directory APIs, and feature flags evolve.

### 1.5.2 What existing platforms do and don’t do

| Platform | What public documentation emphasizes | Limit for Zephix-style PM governance |
|----------|--------------------------------------|--------------------------------------|
| **GitHub** — [Organization roles](https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/roles-in-an-organization) | Org-, team-, and repository-layer roles; optional custom org roles on Enterprise. | Optimized for **repos and code**, not methodology, phase gates, or template-derived project RBAC. |
| **Linear** — [Members and roles](https://linear.app/docs/members-roles) | Workspace Owner / Admin / Member / Guest; team-scoped work. | Strong workspace model; less emphasis on **org-wide PMO + methodology containers** in a single governed PM shell. |
| **Atlassian** — [Admin role types](https://support.atlassian.com/user-management/docs/what-are-the-different-types-of-admin-roles/) | Multiple admin personas (org, site, user access, app). | Validates enterprise expectations; surface area is **split across products** (Jira, Confluence, admin hub)—not one governed PM product boundary. |
| **Asana** — [Admin Console / permissions](https://www.asana.com/features/admin-security/admin-console) | Org-wide admin hub for security and membership on paid tiers. | Admin UX is **prominent by design**; product principles here favor **quieter** governance enforcement unless blocked or configuring. |
| **Stripe** — [Org team access](https://docs.stripe.com/get-started/account/orgs/team) | Org vs account roles for dashboard administration; separate **Entitlements** for feature access vs billing. | Good reference for **billing ↔ entitlement** patterns; Zephix RBAC is **application-owned**, not delegated to payment-dashboard roles. |

**Pattern:** incumbents excel at **layered roles** within their domain (code, issues, org admin). They do **not** standardize **canonical frontend helpers + lint gates** for a single PM platform that must absorb **legacy string entropy** from multiple APIs while staying aligned with NestJS guards.

### 1.5.3 Zephix’s differentiation

| Theme | Concrete mechanics (repo-anchored) |
|-------|-------------------------------------|
| **Discipline-native vs generic abstraction** | **`utils/access.ts` + `utils/roles.ts`**: `normalizePlatformRole`, `PLATFORM_ROLE`, workspace helpers, legacy org-directory predicates (`LEGACY_ORG_ROLE`, `isLegacyOrgDirectoryOwner`). |
| **Multi-tier vs flattened hierarchy** | Hooks (`useWorkspacePermissions`, `useWorkspaceRole`, `useProjectPermissions`) align UI with **platform × workspace × project** separation—see §1.4. |
| **Defense-in-depth vs single-layer enforcement** | **Server matrix authoritative** ([RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md](../RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md)); frontend adds **ESLint Rule A** on **five** guarded paths + **Rule B** warn; Vitest stdin fixtures prove administration paths are covered. |
| **Empirical anchoring vs aspirational marketing** | Phase 1–2 migrations + **HALT-FED2-1** discipline; parity tests (e.g. template publish restoration); shared **`createRolesAccessMocks`** to avoid mock drift. |

**Differentiation in one line:** Zephix treats RBAC as **operational infrastructure**—**canonical helpers**, **lint-enforced** role literals, **shared test harnesses**, and **documented restoration** when migration would silently change permission semantics—while keeping authority on the API.

Background URLs and notes from the evaluation cycle remain in [research-log.md](../external-research/research-log.md); §1.5 is **positioning**, not a bibliography.

---

## 1.6 — Technical Debt & Future Work

| Item | Notes |
|------|--------|
| **`isAdminUser` removal** | Pending zero consumers; track before deletion. |
| **Theme C Phase 3** | Stack 2 HTTP/API consumer migration deferred (evaluation cycle). |
| **Theme D Phase 3** | UI-only workspace permission strings / remaining administration files — see F-E doc. |
| **F-A audit on RBAC mutations** | Server should emit structured audit events on membership/role changes. |
| **Dual `PlatformRole` / normalization tension** | Backend `platform-roles.ts` vs frontend normalization — keep in sync with [RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md](../RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md). |
| **Template publish policy** | Product/architect dispatch before revisiting `TemplateCenterPage` parity vs canonical helpers. |

---

## 1.7 — Architecture Decision Record History & References

### Related in-repo documents

- [RBAC-CANONICAL-HELPERS.md](../../../zephix-frontend/src/utils/RBAC-CANONICAL-HELPERS.md) — helper inventory & lint paths  
- [WS-AF-FE-D-P2-PHASE2-COMPLETION.md](../WS-AF-FE-D-P2-PHASE2-COMPLETION.md) — Phase 2 batch narrative  
- [RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md](../RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md) — authoritative backend + role dimensions  
- [AD-027_LOCKED.md](../AD-027_LOCKED.md), [AD-027-patch3-critical-path-rescoping.md](../AD-027-patch3-critical-path-rescoping.md) — critical path / gate context  
- [AD-028-frontend-work-management-unification.md](../AD-028-frontend-work-management-unification.md), [AD-029-template-module-unification.md](../AD-029-template-module-unification.md), [AD-030-workspace-module-activation.md](../AD-030-workspace-module-activation.md) — adjacent module decisions  
- [PDR-2026-05-06-tenancy-assurance-and-test-reconciliation.md](../PDR-2026-05-06-tenancy-assurance-and-test-reconciliation.md) — tenancy assurance  
- [V21_RECONCILIATION_2026-05-04.md](../V21_RECONCILIATION_2026-05-04.md), [V21_CURRENT_STATE_AUDIT.md](../V21_CURRENT_STATE_AUDIT.md) — reconciliation snapshots  
- [governance-evaluations-retention.md](../governance-evaluations-retention.md) — governance data lifecycle  

### Evaluation-cycle PRs (non-exhaustive)

| PR | Theme |
|----|--------|
| #265 | Theme D Phase 1 — canonical helpers + Rule A establishment |
| #267 | Theme D Phase 2 — lower-risk file migration + tests |
| #268 | Lint Rule A extension to `features/administration/**` |

### Chronological notes

1. Phase 1 locked helper hierarchy and ESLint Rule A on core paths.  
2. Phase 2 migrated lower-risk surfaces with batch HALT gates and restoration discipline where migration touched permission semantics.  
3. Rule A extended to **administration** plural directory after migrations proved clean.  
4. Engine documentation (this file) captures retrospective ADRs for transferability.

---

## Cross-links

- [Engine 6 — Dashboards & KPIs](./engine-6-dashboards-kpis.md)  
- [F-E — Admin Console](../foundations/f-e-admin-console.md)  
- [ADR index](../decisions/README.md)  
- [External research log](../external-research/research-log.md)
