# V21 — Current state audit (template)

**Artifact type:** Evidence-backed snapshot of the platform as built (replaces stale percentage-only narratives).

**Cadence:** Run at milestone boundaries or when sequencing launch-critical work. Archive each completed run under `docs/architecture/proofs/v21/<DATE>-summary.md` (or attach exports there).

**Evidence rule:** Every factual claim cites **command + path** or repo path:line, or is labeled **UNVERIFIED**. Staging/production posture cites **one dated proof** under `docs/architecture/proofs/`.

---

## 0. Run metadata (required)

| Field | Value |
|-------|--------|
| Audit ID | V21 |
| Date (authoritative) | YYYY-MM-DD |
| Git branch | |
| Commit SHA | `git rev-parse HEAD` |
| Auditor(s) | |
| Repo root | Zephix monorepo |

**Pre-flight (branch hygiene):** Per `.cursor/rules/architecture-principles.mdc` — fetch, checkout integration branch, pull, confirm recent merges — before enumerating.

---

## 1. Gate Zero — runtime flags & identity (same sprint as V21)

**Goal:** One dated artifact answers “what is actually ON in each environment?”—no inference from old docs.

| Check | Staging value | Production value | Proof path |
|-------|---------------|------------------|------------|
| `ZEPHIX_WS_MEMBERSHIP_V1` | | | e.g. `docs/architecture/proofs/v21/YYYY-MM-DD-gate-zero-env.md` |
| Backend image / deploy ID | | | |
| Notes on RBAC behavior observed | | | |

**UNVERIFIED until proof row is filled.**

---

## 2. Global enforcement metrics (AD-027 + F-A)

Denominator: HTTP handlers on Nest controllers (approximate route count).

**Suggested commands (paste outputs into appendix or proof folder):**

```bash
# Denominator: route decorators across controllers
rg '@(Get|Post|Put|Patch|Delete)\(' zephix-backend/src --glob '*.controller.ts' | wc -l

# Metric A1 — permission decorator usage (adjust pattern if renamed)
rg '@RequireWorkspacePermission\(' zephix-backend/src --glob '*.ts'

# Metric A2 — workspace access decorator
rg '@RequireWorkspaceAccess\(' zephix-backend/src --glob '*.ts'

# Metric A3 — imperative hotspots (starter set; extend per engine)
rg 'canAccessWorkspace|WorkspacePolicy\.enforce|normalizePlatformRole' zephix-backend/src --glob '*.ts'

# Metric B — guard audit decorator on live controllers
rg 'AuditGuardDecision\(' zephix-backend/src --glob '*.controller.ts' | wc -l
```

| Metric | Definition | Count | % of denominator | Notes |
|--------|------------|-------|------------------|-------|
| **A1** | Routes using `@RequireWorkspacePermission` + guard | | | List primary controllers |
| **A2** | Routes using `@RequireWorkspaceAccess` + guard | | | |
| **A3** | Routes still relying on imperative / mixed checks (grep-driven set) | | | Qualitative roll-up per engine |
| **B** | Routes with `@AuditGuardDecision` on **production** `*.controller.ts` | | | Tests-only usage excluded |

**Do not merge A1–A3 into a single “AD-027 %” without a defined formula.** If publishing one KPI, define it explicitly (e.g. “A1 only” vs “A1 ∪ A2 compliant with batch mapping”).

---

## 3. Engine × implementation matrix

Source of truth for engine **names and canonical paths:** [`CANONICAL.md`](../../CANONICAL.md) Section 1.

Duplicate one block per engine (add rows if CANONICAL lists more).

### Template row set

| # | Field | Fill |
|---|--------|------|
| 1 | Engine name | |
| 2 | CANONICAL / MIGRATING / DEPRECATED | |
| 3 | Backend module path(s) | |
| 4 | Primary route prefixes | |
| 5 | **Top 10 routes** (method + path) — customer-critical | |
| 6 | **Metric A1/A2/A3/B** for those 10 (per route) | |
| 7 | **Tests:** primary suite paths (unit / integration / e2e) | |
| 8 | **Test ownership / gap** | |
| 9 | **MVP blocker?** (Y/N + one line) | |
| 10 | **Schema / migration debt** | |
| 11 | **Frontend surfaces** (routes, major components) — UNVERIFIED if not searched | |
| 12 | **Notes / cross-links** | |

#### Engine: _copy block_

_(Repeat for each engine in CANONICAL.)_

---

## 4. Frontend canonical map (minimum for V21)

**Goal:** Short, factual map of shell + dual paradigms (Work Management vs Work Items per AD-001). Not a full AD suite.

| Area | Canonical entry routes | Key modules | Confirmed in code? (Y/N) | Notes |
|------|------------------------|-------------|---------------------------|-------|
| Shell / app layout | | | | |
| Work Management UX | | | | |
| Work Items UX | | | | |
| Onboarding | | | | |
| Admin entry | | | | |

**Evidence:** List `zephix-frontend/src` paths reviewed.

---

## 5. Operational & commercial readiness

| Item | Code exists? | End-to-end works? | Proof / gap |
|------|--------------|-------------------|-------------|
| Email send (verification, reset, invite) | | | |
| Billing API (`billing/*`) | | | Stripe / live commerce | |
| Legal (ToS / Privacy) | | | | |
| Production environment | | | | |
| Backups / restore drill | | | | |
| Incident runbook | | | | |
| Status page | | | | |

---

## 6. Tenancy & isolation (sequencing input)

| Item | Status | Evidence |
|------|--------|----------|
| Automated tests asserting org/workspace isolation | | Path to specs |
| Manual / third-party pen test | | UNVERIFIED / scheduled / done |
| Known high-risk controllers (data export, admin, search) | | List |

**Ordering reminder:** Scope critical APIs → strengthen tenancy tests → **then** flag-flip decisions.

---

## 7. Track 0 — customer discovery handoff

Not engineering evidence; links PO outputs.

| Week | Interviews | Decision log path | “Will NOT build for SMB v1” |
|------|------------|-------------------|------------------------------|
| 1–2 | | | |
| … | | | |

**Reversible vs non-reversible bets:** List engineering items approved to proceed before discovery completes (e.g. tenancy test harness) vs deferred (e.g. integration breadth).

---

## 8. PO-owned decisions (explicitly unsettled)

Track in PO system of record; mirror status here.

| Decision | Status | Target date |
|----------|--------|-------------|
| Pricing model | UNSETTLED | |
| ICP (10–50 vs 50–500) | UNSETTLED | |
| Beta source | UNSETTLED | |
| Hiring trigger | UNSETTLED | |
| Funding model | UNSETTLED | |

---

## 9. Summary & recommendations

**Top 5 MVP blockers (evidence-backed):**

1.
2.
3.
4.
5.

**Top 5 intentional deferrals:**

1.
2.
3.
4.
5.

**Follow-ups for AD_INDEX / docs:**

- [ ] Blueprint path mismatch resolved (`architecture-principles.mdc` vs actual file)
- [ ] New AD rows added when locked

---

## Appendix A — Raw command outputs

_Paste rg/npm test outputs here or reference files under `docs/architecture/proofs/v21/`._

---

## Appendix B — Endpoint denominator detail (optional)

_Controller list with per-file decorator counts if needed for disputes._
