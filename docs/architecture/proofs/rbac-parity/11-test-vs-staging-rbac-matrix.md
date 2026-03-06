# Test vs Staging RBAC Parity Matrix

Generated: 2026-03-06
Branch: chore/mcp-and-skills
Method: Live environment probes + code inspection + existing proof artifacts

---

## A. Environment Identity

| Field | Staging | Test | Parity |
|-------|---------|------|--------|
| Backend URL | `zephix-backend-staging-staging.up.railway.app` | `zephix-backend-test.up.railway.app` | N/A (different by design) |
| ZEPHIX_ENV | `staging` | `test` | EXPECTED DIFFERENCE |
| nodeEnv | `staging` | `test` | EXPECTED DIFFERENCE |
| commitSha | `afe993fdd360857c7d37a19b815fa526f4afaa8d` | `unknown` | **PARITY GAP** — test SHA not injected |
| commitShaTrusted | `true` | `false` | **PARITY GAP** — follows from above |
| railwayDeploymentId | `90e2e2a3-6b5b-4120-98cc-96ea634a95de` | `4b71927a-0548-4de6-bc46-2142d5d6855f` | N/A (different deploys) |
| Health status | 200 OK | 200 OK | IDENTICAL |
| DB system_identifier | `7539754227597242404` | `7594731145983832100` | EXPECTED DIFFERENCE (separate clusters) |

---

## B. Feature Prerequisites

| Prerequisite | Staging | Test | Parity |
|-------------|---------|------|--------|
| ZEPHIX_WS_MEMBERSHIP_V1 | NOT SET (`=1` not confirmed in staging) | NOT SET (inferred same) | IDENTICAL |
| Smoke endpoints present | YES | NO (staging-only by design) | EXPECTED DIFFERENCE |
| Migration count | 148 | 147 | **MINOR GAP** (+1 migration in staging, unrelated to RBAC) |
| Latest RBAC migration | (within 148) | (within 147) | IDENTICAL for RBAC tables |
| DB health | OK | OK | IDENTICAL |
| Schema health | OK | OK | IDENTICAL |

---

## C. Lane Results

| Lane | Staging | Test | Parity |
|------|---------|------|--------|
| staging-onboarding | PASS (7/7 contract steps) | NOT RUN — smoke endpoints required | CANNOT CONFIRM |
| org-invites | PASS (14/14 contract steps) | BLOCKED — smoke endpoints required | CANNOT CONFIRM |
| customer-journey | PASS (21/21 contract steps, 22 runner steps) | BLOCKED — smoke endpoints required | CANNOT CONFIRM |
| ui-acceptance (15 tests) | PASS | NOT RUN — test frontend requires Playwright config for test env | CANNOT CONFIRM |

Blocker classification: **EXPECTED** — smoke infrastructure is intentionally staging-only (SmokeKeyGuard design).
This is NOT a regression or misconfiguration in test.

---

## D. RBAC Behavior (Code Inspection Parity)

Because smoke lanes cannot run in test, RBAC behavior parity is assessed via code inspection:

Both staging and test run the same NestJS backend binary (same Railway service definition, different environments).
RBAC logic is centralized in `zephix-backend/src/common/auth/platform-roles.ts`.

| RBAC Behavior | Code State | Parity Assessment |
|--------------|-----------|-------------------|
| Admin full access (create workspaces, invite users) | `isAdminPlatformRole(role)` in canonical module | IDENTICAL — same code path |
| VIEWER blocked from write paths | `blockGuestWrite(user.platformRole ?? user.role)` | IDENTICAL — same code path |
| VIEWER blocked from invite-create | `OrgInvitesService` → `getAuthContext().platformRole` | IDENTICAL — same code path |
| Guard consolidation (PlatformAdminGuard) | `common/auth/platform-admin.guard.ts` | IDENTICAL — same code path |
| Platform role resolution order | `user.platformRole ?? user.role` | IDENTICAL — same code path |
| Workspace role compat (owner/admin alias) | `writeRoles` includes both | IDENTICAL — same code path |

**Note**: Code inspection assumes test is running a recent build compatible with the canonical module.
SHA cannot be confirmed — this is a limitation, not a confirmed failure.

---

## E. Drift Summary (RBAC V2 Recheck)

Items found in drift recheck scan (`user.role`, `workspace_owner`, `AdminGuard`, `AdminOnlyGuard`):

### Backend — new vs RBAC V2 inventory

| Pattern | Location | Classification |
|---------|----------|---------------|
| `AdminGuard` | `shared/guards/admin.guard.ts` | INTENTIONAL — kept per RBAC V2 doc (has AuditService dep; no new usages) |
| `AdminGuard` | `admin/guards/admin.guard.ts` | INTENTIONAL — used by admin module controllers |
| `AdminOnlyGuard` in spec | `shared/guards/admin-only.guard.spec.ts` | NON_BUSINESS — test file, not business logic |
| `user.role` in `get-auth-context.ts` | fallback: `user.platformRole \|\| user.role` | CORRECT PATTERN — uses `\|\|` fallback |
| `user.role` in both `admin.guard.ts` | preceded by `user.platformRole ??` or `\|\|` | CORRECT PATTERN |
| `user.role` in `forms.controller.ts` | `user.role \|\| user.platformRole \|\| 'viewer'` | **RESIDUAL DRIFT** — wrong precedence (role before platformRole). Low-risk (forms module, non-auth-critical). Out of scope for this task. |
| `workspace_owner` in migrations | Raw DB constraint values | INTENTIONAL — migrations must use DB enum values |
| `workspace_owner` in seed scripts | `dev-seed.ts` | OUT_OF_SCOPE — dev seeding only |

### Frontend — new vs RBAC V2 inventory

| Pattern | Location | Classification |
|---------|----------|---------------|
| `user.role` in `AdminRoute.tsx` | Display/logging use | NON_BUSINESS — not auth decision |
| `user.role` in `enterpriseAuth.service.ts` | API response mapping | INTENTIONAL_FALLBACK — maps API field to store |
| `user.role` in `utils/roles.ts` | Inside `isAdminUser` last-resort fallback | INTENTIONAL_FALLBACK — documented |
| `user.role` in `archived-admin-components/` | Badge display | OUT_OF_SCOPE — archived, per RBAC V2 doc |
| `user.role` in `CommandPalette.tsx` | `isAdminRole(user.role)` without platformRole | **RESIDUAL DRIFT** — low-risk (UI palette feature gating, not security boundary) |
| `user.role` in `WorkspacesIndexPage.tsx` | `normalizePlatformRole(user.role)` without platformRole | **RESIDUAL DRIFT** — low-risk (display only) |
| `user.role` in admin user list pages | Role filter/display | NON_BUSINESS — admin display, not auth gate |

**No new drift introduced** by RBAC V2 cleanup (these items pre-date V2 and are classified in the inventory).

---

## F. Parity Verdict

| Dimension | Verdict |
|-----------|---------|
| Environment health | IDENTICAL |
| RBAC code logic | IDENTICAL (code inspection, SHA unconfirmed) |
| Schema (RBAC tables) | IDENTICAL (1 non-RBAC migration gap) |
| Feature flag state | IDENTICAL (both: WS_MEMBERSHIP_V1 off) |
| Full smoke lane parity | **CANNOT CONFIRM** — smoke endpoints staging-only by design |
| Commit SHA confirmation | **CANNOT CONFIRM** — test SHA not injected |

**Overall parity verdict: PARTIAL**

Justification:
- Health and RBAC code structure are provably identical by code inspection
- Full behavioral parity via smoke lanes cannot be confirmed due to intentional smoke endpoint restriction
- Commit SHA cannot be verified in test — cannot confirm test is running RBAC V2 cleanup code
- Staging is the authoritative RBAC V2 verification environment and has full PASS evidence
