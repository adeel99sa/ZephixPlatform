# Template Center MVP Readiness Checklist

Use this checklist to confirm platform safety gaps (A–F) and the rollout sequence before claiming MVP-ready.

---

## A. Authorization consistency

- **Every project-scoped handler** calls project access checks before any read or write. Evidence pack, document lifecycle, project KPIs, gate approvals: all use `organizationId` and `workspaceId` from auth (via `getTemplateCenterScope(auth)` or equivalent); project lookup enforces `project.organizationId === auth.organizationId` and 403 on violation.
- **Evidence pack, search, templates list, KPI reads, doc reads** enforce scope derived from auth only. No endpoint accepts `orgId` from query. Templates list accepts `workspaceId` from query only after `getTemplateCenterScope(auth, query.workspaceId)` validates it against `auth.workspaceIds` / `auth.workspaceId`.
- **No endpoint uses query workspaceId** without validating it against auth (see `template-center-scope.util.ts`).

---

## B. Data integrity (old vs new template systems)

- **TemplatesInstantiateService** (Phase 4 / work-management templates) uses `ProjectTemplate`, `Project`, `Task`, `Workspace` only. It does **not** write to `template_lineage`, `template_definitions`, or any Template Center tables. Template Center is additive; apply is the only path that creates Template Center data.
- **Seeds** (`template-center:seed:kpis`, `template-center:seed:docs`, `template-center:seed:templates`) require `TEMPLATE_CENTER_SEED_OK=true`. In production, leave **TEMPLATE_CENTER_SEED_OK** unset or false so seeds do not run.
- **No background jobs** write to Template Center tables unless explicitly part of an apply or document/gate flow.

---

## C. Migration safety and deploy order

- **Migration runs before start**: Railway does not run migrations in `railway.toml` by default. Run `db:migrate` (or your migration command) as a **pre-deploy / release command** or manually after deploy, before traffic.
- **App start**: `startCommand` is `npm run start:railway` (production). Ensure migrations complete before the app is considered healthy.
- **Readiness**: `/api/health/ready` returns **503** until DB connectivity and schema verify pass. It uses `DatabaseVerifyService.verify()` (pending migrations, required tables). So readiness flips to 200 only after DB and schema are valid.

**What must be true every deploy:**

1. Migration runs before (or as part of) release.
2. App starts only after schema verify can pass (migrations applied).
3. Readiness returns 503 until DB and schema verify pass, then 200.

---

## D. Audit table growth and retention

- **Indexes on audit_events**: Existing indexes include `event_type`, `(workspace_id, project_id)`, `(user_id, created_at)`. Added **`idx_audit_events_project_event_type`** on `(project_id, event_type)` for triage by project and event type (e.g. TEMPLATE_APPLY_FAILED, GATE_DECIDE_BLOCKED).
- **Evidence pack** does **not** query `audit_events`. It queries `template_lineage`, `gate_approvals`, `document_instances`, `project_kpis`, `kpi_values` only, all constrained by `project_id`.

---

## E. Performance of evidence pack

- **Queries use project_id**: Lineage, gate_approvals, document_instances, project_kpis are loaded with `where: { projectId }`; indexes exist on `project_id` for these tables.
- **No N+1**: Latest KPI value per project KPI is loaded in a single query using `DISTINCT ON (project_kpi_id) ... ORDER BY project_kpi_id, recorded_at DESC` instead of one query per project KPI.

---

## F. Failure modes for external dependencies

- **Document transition** does **not** validate `externalUrl` reachability (no `fetch` or HTTP call). It only persists `externalUrl` and `fileStorageKey` as provided.
- **No network calls** during request handling for Template Center document transition; validation is shape-only (fields present), not availability.

---

## Right sequence for MVP rollout

1. Merge only Template Center backend changes plus migrations plus scripts.
2. Deploy to staging with **TEMPLATE_CENTER_V1=false**.
3. Run **db:migrate** in staging.
4. Verify **/api/health/ready** returns 200.
5. Run **scripts/validate/template-center-final-check.sh** against staging.
6. Set **TEMPLATE_CENTER_V1=true** in staging.
7. Apply a template to a test project.
8. Run gate decide with missing blockers; confirm 409 and audit event.
9. Run rollback drill; turn flag off and confirm all Template Center endpoints return 404 with zero side effects.
10. Promote to production with flag off first.
11. Run **db:migrate** in production.
12. Turn flag on for a small internal cohort only.

---

## What to measure to claim MVP-ready

**Reliability**

- Apply duplicate rate: **zero** (one lineage per projectId + templateVersionId; idempotent apply).
- Gate blocked rate: **non-zero** is expected (enforcement working).
- Document transition failure rate: **low**; spikes may indicate UX or role issues.

**Deploy safety**

- Every deploy logs schema verify OK and **pending_migrations=0** (or equivalent).
- Health ready stays **503** until those are true, then **200**.

**Supportability**

- For any user report, an **audit_event** can be found within 60 seconds using **projectId** and **event_type** (index `idx_audit_events_project_event_type`).

---

## Proof signals (screenshots to validate “no missing angle”)

1. **Railway service settings**: Root directory, build command, start command, pre-deploy command (if any), health check path.
2. **Staging deploy log**: Snippet from BOOT_START through **schema_verify_ok** and **pending_migrations=0**.
3. **curl /api/health/ready**: Once when migrations are **not** run yet (expect 503), then after running migrations (expect 200).
