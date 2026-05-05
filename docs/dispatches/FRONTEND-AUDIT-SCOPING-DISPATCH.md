# DISPATCH: Frontend Audit — Scoping Phase

**Status:** Authored 2026-05-05. SCOPING DISPATCH — recon authorized, execution NOT authorized.
**Author:** Solution Architect (Claude)
**Type:** Reconnaissance + architectural validation. NO code changes in this dispatch.
**Engine 1 criterion 7:** Component of closure path. Currently UNVERIFIED status per V21 Reconciliation 2026-05-04.
**V21 re-scoping:** "Validation audit, not missing-feature audit. Gantt depth/parity validation, calendar gap, frontend capability/module wiring readiness for AD-030 v2, AD-028 readiness check. ~3h architect."

---

## CRITICAL CONTEXT — read first

**This is a SCOPING dispatch.** Its purpose is to authorize Phase 0 reconnaissance that grounds the actual execution dispatch.

Per V21 Reconciliation, Frontend Audit was re-scoped from "build missing features" to "validate existing features against parity benchmarks + identify capability/module wiring gaps for upcoming dispatches."

**Scoping discipline applied:**

The dispatch could be authored against assumed scope ("validate Gantt against unknown parity benchmark"). That would repeat the pre-recon-stale dispatch pattern that bit PR #8a, PR #8b, and the Task Entity Drift dispatch this session. Each cycle wasted ~2-4 hours.

Instead: scoping dispatch authorizes Phase 0 recon to determine:

1. What "Gantt parity" actually means (what's the benchmark)
2. What current Gantt state actually is
3. What "calendar gap" specifically refers to
4. What AD-030 v2 readiness requires from frontend
5. What AD-028 readiness check entails

After Phase 0 recon, architect re-scopes execution dispatch with verified surface area.

**Estimated total:** ~30-45 min recon + ~1-1.5h scoping dispatch authoring + ~2-3h execution dispatch authoring + executor work TBD per findings.

---

## Why this dispatch exists

Engine 1 criterion 7 is UNVERIFIED. V21 Reconciliation re-scoped Frontend Audit on 2026-05-04 from "missing-feature build" to "validation audit." This dispatch authorizes the validation work.

Frontend footprint per Cursor pre-recon:

- 568 .tsx files
- 321 .ts files
- 49 page entries
- 41 top-level feature directories
- Substantial existing surface — validation audit must navigate this

---

## Scope of this scoping dispatch

### What this dispatch IS

Authorized reconnaissance + architectural decision-making across 4 audit areas:

**Phase 0a:** Gantt depth/parity validation surface — capture what Gantt currently does + identify parity benchmark
**Phase 0b:** Calendar gap assessment — identify what "calendar gap" refers to in V21 context
**Phase 0c:** Frontend capability/module wiring readiness for AD-030 v2
**Phase 0d:** AD-028 readiness check (AD-028 is locked but implementation deferred to AD-010 Engine 3 closure)

After Phase 0a-d, executor HALTs. Architect commits to validation findings + execution dispatch scope.

### What this dispatch is NOT

- **NOT** a fix dispatch. No code changes, no UI changes, no test changes occur from this dispatch's authority.
- **NOT** a "build missing Gantt features" dispatch (V21 re-scoped away from this framing)
- **NOT** AD-028 implementation (deferred to Engine 3 AD-010 closure)
- **NOT** Engine 4 Phase B work (separate dispatch, already unblocked)
- **NOT** template-related frontend work (Engine 4 territory)
- **NOT** backend changes
- **NOT** authoring follow-up frontend dispatches (those happen after this scoping completes)

### Hard scope boundary

Reconnaissance + analysis only. Final deliverable: written report (paste into architect conversation) capturing:

1. Per-area current state evidence
2. Per-area gap-to-target analysis (where target is parity benchmark or AD readiness criteria)
3. Recommended execution dispatch scope per area
4. Estimated effort per area
5. Risks, unknowns, escalations

---

## Phase 0a: Gantt depth/parity validation

Goal: Identify current Gantt component state + parity benchmark + delta.

### Reconnaissance commands

```bash
cd zephix-frontend

# 1. Locate Gantt component(s)
find src -type d -iname "*gantt*" 2>/dev/null
find src -type f -iname "*gantt*" 2>/dev/null | head -30

# 2. Read main Gantt component
# (cat the largest .tsx file in gantt directory or main gantt feature)
ls -la src/components/gantt 2>/dev/null
ls -la src/features/gantt 2>/dev/null
ls -la src/pages/*gantt* 2>/dev/null

# 3. Capture Gantt component dependencies
grep -rn "from.*gantt\|import.*Gantt" src --include="*.tsx" --include="*.ts" | head -20

# 4. What renders the Gantt? (entry points)
grep -rn "<Gantt" src --include="*.tsx" -B 2 -A 2 | head -30

# 5. Backend endpoints Gantt consumes
grep -rn "gantt\|chart" src --include="*.tsx" --include="*.ts" -i | grep -E "fetch|axios|api\." | head -20

# 6. Library or third-party Gantt usage
grep -E "frappe-gantt|dhtmlx|gantt-task-react|@bryntum|wx-react-gantt" package.json

# 7. Test coverage
find src -name "*gantt*.test.*" -o -name "*gantt*.spec.*" 2>/dev/null | head -10
```

### Phase 0a output requirement

Per-feature comparison table (current vs benchmark — benchmark TBD per architect call after recon):

| Capability | Current implementation? | Target benchmark | Gap |
|---|---|---|---|
| Tasks rendering on timeline | YES/NO + evidence | Industry-standard project management Gantt | TBD |
| Dependency arrows | YES/NO + evidence | Critical path visualization | TBD |
| Drag-to-reschedule | YES/NO + evidence | Standard interaction | TBD |
| Critical path highlight | YES/NO + evidence | AD-027 critical-path requirement | TBD |
| Resource allocation overlay | YES/NO + evidence | Per AD-024 attribute architecture | TBD |
| Phase grouping | YES/NO + evidence | PMBOK 7+8 phase-gate alignment | TBD |
| ... | ... | ... | ... |

**Architect needs to provide parity benchmark.** Phase 0a recon captures CURRENT STATE; benchmark comparison happens during Gate 2 review.

---

## Phase 0b: Calendar gap assessment

Goal: Identify what "calendar gap" refers to in V21 reconciliation context. May be specific feature gap (e.g., calendar view missing) OR data integration gap (e.g., calendar sync to external systems).

### Reconnaissance commands

```bash
cd zephix-frontend

# 1. Find calendar-related code
find src -type d -iname "*calendar*" 2>/dev/null
find src -type f -iname "*calendar*" 2>/dev/null | head -20

# 2. V21 Reconciliation context for "calendar gap"
cd ..  # back to repo root
grep -B 5 -A 15 -i "calendar gap\|calendar.*missing\|calendar.*scope" docs/architecture/V21_RECONCILIATION_2026-05-04.md

# 3. Calendar references in all architecture docs
grep -rn -i "calendar" docs/architecture/ --include="*.md" | head -20

# 4. Calendar in current frontend
cd zephix-frontend
grep -rn -i "calendar" src --include="*.tsx" --include="*.ts" | head -30

# 5. Check if calendar libraries in use
grep -E "react-calendar|fullcalendar|date-fns|@mui/x-date-pickers|big-calendar" package.json
```

### Phase 0b output requirement

Concrete identification of "calendar gap" with evidence:

- What V21 Reconciliation refers to as the gap
- What current frontend has that's calendar-related
- Specific delta to close

If recon can't find clear V21 context for "calendar gap" → STOP, escalate to architect for V21 author intent clarification.

---

## Phase 0c: Frontend capability/module wiring readiness for AD-030 v2

Goal: Per AD-030 v2 (workspace module activation), identify whether frontend has plumbing to consume `@RequireWorkspaceModule` decorator outcomes from backend, OR whether frontend module-feature gating has parallel wiring needs.

### Reconnaissance commands

```bash
cd zephix-frontend

# 1. Find module-related frontend code
grep -rn "moduleEnabled\|workspaceModule\|@RequireWorkspaceModule" src --include="*.tsx" --include="*.ts" | head -20

# 2. Capability/feature gating frontend pattern
grep -rn "useFeature\|useCapability\|featureFlag\|capability" src --include="*.tsx" --include="*.ts" | head -30

# 3. Workspace context provider on frontend
find src -name "*workspace*" -o -name "*Workspace*" | head -20
grep -rn "WorkspaceContext\|workspaceContext\|useWorkspace" src --include="*.tsx" --include="*.ts" | head -20

# 4. Backend AD-030 v2 reference
cd ..
cat docs/architecture/AD-030-v2*.md 2>/dev/null || find docs/architecture -name "*030*"

# 5. AD-030 v2 expected frontend readiness
grep -B 2 -A 20 -i "frontend\|client" docs/architecture/AD-030*.md 2>/dev/null | head -40
```

### Phase 0c output requirement

Readiness assessment:

- What frontend currently does for module/capability gating
- What AD-030 v2 expects frontend to do (if specified)
- Whether AD-030 v2 implementation requires frontend changes OR can succeed with backend-only enforcement
- Recommended execution dispatch scope (if frontend changes needed)

---

## Phase 0d: AD-028 readiness check

Goal: AD-028 (frontend work management unification) is committed but implementation deferred to AD-010 (Engine 3 backend) closure. This phase identifies what frontend prep work is reasonable BEFORE AD-010 closes.

### Reconnaissance commands

```bash
# 1. Read AD-028 in full
cat docs/architecture/AD-028*.md 2>/dev/null

# 2. AD-010 status (Engine 3 dependency)
grep -B 2 -A 20 -i "AD-010" docs/architecture/AD_INDEX.md

# 3. Current work management frontend state
cd zephix-frontend
find src -type d -iname "*work-management*" -o -iname "*workmanagement*" 2>/dev/null
ls -la src/features/work-management 2>/dev/null
ls -la src/pages/work* 2>/dev/null

# 4. Capacity/demand frontend (related to backend work-management drift findings)
find src -iname "*capacity*" -o -iname "*demand*" 2>/dev/null | head -10

# 5. Existing work item frontend
grep -rn "WorkItem\|workItem\|work_item" src --include="*.tsx" --include="*.ts" | head -20
```

### Phase 0d output requirement

Concrete identification of:

- AD-028 scope per AD document
- AD-010 closure prerequisites still pending
- Reasonable frontend prep work BEFORE AD-010 closes (e.g., type definitions, capability hooks, module structure)
- Recommended dispatch boundary: what's "ready now" vs "blocked on AD-010"

---

## Hard constraints

### CONSTRAINT 1: NO code changes in this scoping dispatch

Reconnaissance only. No frontend edits, no test additions, no documentation changes (beyond what's saved as audit artifact at end).

### CONSTRAINT 2: NO scope expansion to actual audit execution

This dispatch produces FINDINGS. Execution dispatch (separate document, after architect re-scope) produces FIXES.

If during recon, executor sees "obvious" small fix and is tempted to apply → STOP. Capture as finding. Architect decides scope.

### CONSTRAINT 3: NO premature framing

Don't frame Gantt as "broken" or "missing features" until parity benchmark established. V21 re-scoped to "validation audit" — current Gantt may be more capable than initial assumption.

### CONSTRAINT 4: HALT for architect re-scope after Phase 0

Mandatory HALT after Phase 0a/b/c/d outputs paste. Architect:

1. Reviews findings per area
2. Provides parity benchmarks (where TBD in dispatch)
3. Commits to execution dispatch scope per area
4. Authors execution dispatch (or multiple, per area)

NO unauthorized progression to fix execution.

### CONSTRAINT 5: Pre-investigation discipline

Before Phase 0 commands, executor verifies:

- Working directory is fresh worktree at canonical `origin/staging` HEAD (post-PR-251 if PR #251 has merged, OR PR #250 SHA `45f3e7f2` if not yet)
- Frontend dependencies installed (`zephix-frontend/node_modules` exists OR run `npm install`)
- No uncommitted changes that could pollute findings

If pre-investigation fails, STOP — workspace hygiene discipline.

### CONSTRAINT 6: Reversibility — N/A

Recon-only dispatch. Nothing to revert.

### CONSTRAINT 7: Bounded recon time

Phase 0a + 0b + 0c + 0d estimated total: ~2-3 hours executor work. If recon exceeds 4 hours without producing actionable findings, STOP and report — may indicate scope is broader than dispatch anticipated.

---

## Sequencing and dependencies

### Upstream dependencies

- ✓ V21 Reconciliation 2026-05-04 (frontend audit re-scoped)
- ✓ AD-028 in-tree (locked, implementation deferred)
- ✓ AD-030 v2 in-tree (committed)

### Downstream dependencies

- **Execution dispatch(es)** authored after this scoping dispatch's Phase 0 outputs reviewed. May produce single execution dispatch OR multiple (per area).
- **Engine 1 criterion 7 closure** depends on execution dispatch(es) closing successfully

### Sequencing diagram

```
V21 ✓ → THIS SCOPING DISPATCH → Phase 0 recon → Architect re-scope → Execution Dispatch(es) → Implementation PR(s) → Engine 1 criterion 7 closes
```

---

## Estimated effort

- **Phase 0a (Gantt validation):** ~45-60 min executor
- **Phase 0b (Calendar gap):** ~20-30 min executor
- **Phase 0c (AD-030 v2 readiness):** ~30-45 min executor
- **Phase 0d (AD-028 readiness):** ~30-45 min executor
- **Total executor work:** ~2-3 hours, single focused session

- **Architect Gate 2 review:** ~45-60 min (parity benchmarks + scope decisions per area)
- **Architect execution dispatch authoring:** ~2-3 hours (single dispatch) OR ~4-6 hours total (split per area)
- **Architect PR review (when execution implements):** ~45 min

---

## Success criteria for THIS scoping dispatch

This dispatch closes successfully when:

- [ ] All Phase 0 commands run, raw outputs captured per area
- [ ] Per-area current state evidence documented
- [ ] Per-area gap analysis produced (current vs target)
- [ ] Findings paste in architect conversation
- [ ] Architect provides parity benchmarks where TBD
- [ ] Architect commits to execution dispatch scope per area
- [ ] Architect authorizes execution dispatch authoring

This scoping dispatch does NOT close on PR merge — it closes on architect's "execution dispatch is authored, scoping done."

---

## Architectural finding (parent of this dispatch)

This scoping dispatch addresses Engine 1 criterion 7 closure path that V21 Reconciliation specifically re-scoped away from "build missing features" framing.

If Phase 0 recon reveals that "validation audit" is actually closer to "missing-feature build" because current frontend is much further from parity than V21 anticipated, that's a major finding requiring architect re-evaluation of V21 itself.

Tracked: V21 Reconciliation may need addendum if Frontend Audit recon contradicts re-scoping assumption.

---

## Document end

This scoping dispatch is binding until executor reports Phase 0 outputs and architect produces execution dispatch.

If recon reveals state significantly different from preamble assumptions (frontend is much smaller/different than recon's 568 .tsx files would suggest, OR major feature areas missing entirely, OR Gantt doesn't exist), STOP and report — architect re-scopes scoping dispatch itself.

**HALT discipline mandatory throughout. No fixes from this dispatch's authority. Execution dispatch follows after Gate 2 review.**
