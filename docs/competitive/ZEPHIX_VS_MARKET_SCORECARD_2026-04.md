# Zephix vs Market: Scorecard, Matrix & Improvement Plan

**Date:** 2026-04-16  
**Sources:** In-repo research (`docs/competitive/*`, `docs/monday-com-*.md`, ClickUp gap docs, `PLATFORM-AUDIT-REPORT.md` 2026-04-14). Competitor scores for non-Zephix platforms follow **public documentation and industry positioning**, not live product audits.

**Purpose:** One place to compare Zephix to **Monday.com**, **ClickUp**, **Linear**, plus **Asana** (brief) and **enterprise PPM** references, with scores, differentiators, and prioritized improvements.

---

## 1. Scoring legend

| Score | Meaning |
|------:|---------|
| **0** | Not present / not applicable to category |
| **1** | Basic or manual workaround only |
| **2** | Functional; limited depth or configuration |
| **3** | Strong; real logic, policies, or integrations |
| **4** | Best-in-class depth for the category |

Scores for Zephix **governance dimensions** below align with the audited methodology in [`CAPABILITY_MATRIX_v1.md`](./CAPABILITY_MATRIX_v1.md) (code-backed where marked **(C)**).

---

## 2. Core governance & PPM matrix (0–4)

Dimensions that matter for **regulated delivery, PMO, and portfolio governance** (not “feature count”).

| Dimension | Zephix | Monday | ClickUp | Linear | Asana* | Notes |
|-----------|:------:|:------:|:-------:|:------:|:------:|-------|
| **Gate / phase-gate enforcement** | **4** | 1 | 2 | 0 | 1 | Zephix: multi-factor evaluator + policy modes; Monday: automations only; Linear: issue tracker, not PPM |
| **Policy hierarchy (org → workspace → project)** | **4** | 1 | 1 | 0 | 1 | Zephix: explicit engine + precedence; others: settings, not a unified policy cascade |
| **Resource conflict math + thresholds** | **4** | 2 | 1 | 0 | 2 | Zephix: week/day aggregation + gates; ClickUp/Monday: workload UI, weak documented math |
| **Earned value / financial rollups** | **3** | 2 | 0 | 0 | 1 | Zephix: BAC/AC/EV/CPI/EAC in codebase; ClickUp/Linear: not EVM-class |
| **Risk governance (scoring + automation)** | **3** | 2 | 2 | 0 | 1 | Zephix: entities + cron detection + gate linkage; Linear: not a risk product |
| **Program / portfolio rollup** | **3** | 2 | 1 | 1 | 2 | Enterprise PPM tools still lead on portfolio optimization depth |
| **Multi-tenant isolation & workspace model** | **4** | 2 | 2 | 1 | 2 | Zephix: repository-scoped tenancy + workspace roles documented in audit |
| **Notifications (depth + realtime)** | **2** | 3 | 3 | 2 | 3 | Zephix: email + in-app + polling; others: stronger realtime + chat ecosystem |

\* **Asana** scores are **approximate** (lighter research in-repo); treat as directional vs Monday/ClickUp.

### Row totals (sum of 8 dimensions, max 32)

| Platform | Total | Avg |
|----------|------:|----:|
| **Zephix** | **27** | **3.4** |
| Monday.com | 15 | 1.9 |
| ClickUp | 12 | 1.5 |
| Linear | 4 | 0.5 |
| Asana (est.) | ~10–12 | ~1.3 |

**Interpretation:** On **governance-heavy** dimensions, Zephix is positioned closer to **enterprise PPM** than to mid-market work tools. Linear is **not** a PPM peer—it wins on **delivery-team UX**, not portfolio governance.

*Full competitor methodology and enterprise PPM columns (Planview, Clarity, MS Project) are in [`CAPABILITY_MATRIX_v1.md`](./CAPABILITY_MATRIX_v1.md).*

---

## 3. “Product completeness” dimensions (different battle)

These are where **Monday / ClickUp** usually *feel* more complete to buyers (breadth, polish, ecosystem).

| Dimension | Zephix | Monday | ClickUp | Linear |
|-----------|:------:|:------:|:-------:|:------:|
| **Integration marketplace & Zapier-class breadth** | 1–2 | 4 | 4 | 2–3 |
| **Admin UX: SAML / SCIM / enterprise IdP** | 1 | 4 | 4 | 4 |
| **Widget / dashboard variety** | 2 | 4 | 4 | 2 |
| **Gantt editing & critical path** | 1–2 | 4 | 4 | 0–1 |
| **Mobile apps maturity** | 2 | 4 | 4 | 4 |
| **Time tracking / timesheets** | 1 | 3 | 4 | 2 |
| **AI-assisted PM (docs → plan, etc.)** | 1 | 3 | 4 | 2 |

Qualitative scores — see [`COMPREHENSIVE_PLATFORM_COMPARISON.md`](./COMPREHENSIVE_PLATFORM_COMPARISON.md) and [`PLATFORM_COMPARISON_EXECUTIVE_SUMMARY.md`](./PLATFORM_COMPARISON_EXECUTIVE_SUMMARY.md).

---

## 4. Where Zephix is **stronger** (defensible claims)

Use these in positioning; tie each to **product proof** when selling.

| Advantage | Why it matters | Evidence in repo |
|-----------|----------------|------------------|
| **Governance-first architecture** | Gates, policies, and rollups are **first-class**, not retrofitted columns | Policy + gate services; [`CAPABILITY_MATRIX_v1.md`](./CAPABILITY_MATRIX_v1.md) |
| **Resource % as core truth** | Allocations and conflict math tied to **validation and gates** | `resource-allocation`, `resource-conflict-engine`, heatmap |
| **Template → runnable system** | Template instantiation creates **phases/tasks** transactionally (not just a board layout) | ADR-004; template-center services |
| **Tenant + workspace boundaries** | Org-scoped data paths, workspace roles, cross-workspace isolation patterns | `TenantAwareRepository`, audit report Section 2–3 |
| **Earned value + budget baselines** in product | Many mid-market tools **don’t** ship CPI/SPI/EAC as native logic | Budget services in matrix |
| **Honest category separation** | Competing against **Monday/ClickUp on governance** is asymmetric—Zephix wins on **control plane** depth | [`zephix-competitive-advantage-synthesis.md`](./zephix-competitive-advantage-synthesis.md) |

**Philosophy gap (Monday / ClickUp):** Those products optimize for **infinite configurability**; Zephix optimizes for **fewer degrees of freedom and stronger guarantees** (resources unavoidable, templates deploy systems). See synthesis doc § “The Opposite of Monday & ClickUp”.

---

## 5. Where competitors are **ahead today**

| Area | Leader | Implication for Zephix |
|------|--------|-------------------------|
| **Integration surface** | Monday, ClickUp | Need phased marketplace / webhooks / key SaaS connectors for enterprise deals |
| **Enterprise IdP** | All three + Asana | SAML/SCIM table stakes for IT-led procurement |
| **Realtime UX** | Monday, ClickUp, Linear | Replace polling with SSE/WebSocket for notifications where possible |
| **Visualization** | Monday, ClickUp | Gantt **editing**, workflow canvas, widget library size |
| **Time entry** | ClickUp, Monday | Timesheet workflows are expected in many PMO RFPs |
| **AI PM gimmicks** | ClickUp (marketing + features) | Only invest where aligned with **governance truth**, not checklist parity |

**ClickUp-specific failure modes** (trust): resource modeling inconsistencies, permission complexity at scale — documented in [`clickup-gap-resource-modeling.md`](./clickup-gap-resource-modeling.md), [`clickup-gap-permissions-enterprise.md`](./clickup-gap-permissions-enterprise.md), [`clickup-gap-pmo-rollout-pain.md`](./clickup-gap-pmo-rollout-pain.md).

**Monday-specific failure modes** (scale): IA drift, rollup manual work, template/KPI governance — see `docs/monday-com-*.md` and comprehensive comparison.

---

## 6. Recommendations (prioritized)

### P0 — Credibility & revenue blockers

1. **Realtime notifications path** (SSE/WebSocket or push) — closes gap vs “feels broken” vs Slack-era tools.  
2. **SAML (SSO)** — required for many enterprise pilots; called out in executive summary.  
3. **Stable public API + 1–2 strategic integrations** (e.g. Slack notify, GitHub link) — proof of ecosystem.  
4. **Policy / governance admin UX** — APIs exist; operators need UI (matrix: “Policy admin UI” gap).

### P1 — PMO parity without becoming ClickUp

5. **Portfolio risk / rollup dashboards** — aggregate risk endpoint + UI (matrix already flags gap).  
6. **Gantt interactive edit** — high effort; sequence after schedule model stability (audit: large `WaterfallTable`, read-only Gantt noted in matrix).  
7. **Multi-step approvals** — extends gates for enterprise procurement.  
8. **Frontend type health & shell polish** — audit notes ~24 TS errors and UX debt; impacts perceived quality vs Linear.

### P2 — Differentiation depth

9. **Resource leveling / what-if** — matches Planview-class scenarios when core engine is bulletproof.  
10. **KPI packs as shipped product** — philosophy doc promises; execution makes “automatic rollups” tangible in demos.  
11. **Template governance UX** — versioning/drift as **visible** controls, not only backend.

---

## 7. How to use this doc

- **Investors / GTM:** Lead with §4 and the governance matrix totals; acknowledge §5 honestly.  
- **Engineering:** Map P0–P2 to roadmap; use [`CAPABILITY_MATRIX_v1.md`](./CAPABILITY_MATRIX_v1.md) for depth.  
- **Competitive intel:** Refresh competitor scores when major releases ship (Monday/ClickUp ship frequently).

---

## 8. Source index (in-repo)

| Document | Focus |
|----------|--------|
| [`CAPABILITY_MATRIX_v1.md`](./CAPABILITY_MATRIX_v1.md) | Scored dimensions, enterprise PPM columns, methodology |
| [`COMPREHENSIVE_PLATFORM_COMPARISON.md`](./COMPREHENSIVE_PLATFORM_COMPARISON.md) | Feature-by-feature breadth |
| [`PLATFORM_COMPARISON_EXECUTIVE_SUMMARY.md`](./PLATFORM_COMPARISON_EXECUTIVE_SUMMARY.md) | Completeness %, quick answers |
| [`zephix-competitive-advantage-synthesis.md`](./zephix-competitive-advantage-synthesis.md) | Strategy, philosophy vs Monday/ClickUp |
| [`clickup-gap-*.md`](./) | ClickUp weakness deep dives |
| `docs/monday-com-work-management-admin-templates.md` | Monday IA / templates / admin |
| `PLATFORM-AUDIT-REPORT.md` (repo root) | April 2026 technical reality check |

---

*This document is descriptive market context. It does not define MVP scope; see `docs/scope/` for scope authority.*
