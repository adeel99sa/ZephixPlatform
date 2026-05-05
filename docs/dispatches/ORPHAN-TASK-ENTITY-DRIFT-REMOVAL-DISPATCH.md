================================================================
EXECUTOR DISPATCH: Orphan Task Entity Drift Removal
================================================================

ROLE: Backend Developer  
SKILLS: 20-backend-nestjs, 50-testing-gates, 60-migrations-db  
AUTHORITY: Architect per PR #250 follow-up (Audit 4: canonical drift fixed;  
orphan `tasks` entity remained live and drifted).  
EXECUTION BRANCH: `fix/orphan-task-entity-drift-removal` (from `origin/staging`)  
TARGET PR: `staging`

================================================================
WHY THIS PR EXISTS
================================================================

PR #250 removed drifted columns from the **canonical** Task entity path.  
Production code for legacy `/tasks` continues to use the **orphan** entity at  
`src/modules/tasks/entities/task.entity.ts` (`@Entity('tasks')`). That entity  
still declared five columns that were never migrated to the `tasks` table,  
causing TypeScript/ORM surface drift and silently broken reads/writes for  
those properties.

Pre-recon (tsc simulation on `origin/staging` @ merge `45f3e7f2`): **7** compile  
errors in **2** files only — `kpi.service.ts` and `tasks.service.ts`, all tied  
to **`startDate` / `endDate`** on the orphan `Task` type.  
**Correction (verified):** `kpi.service.ts:54` contributes **2** errors, both on  
`endDate` (no `startDate` errors in KPI). `tasks.service.ts` contributes the  
remaining errors (mixed `startDate`/`endDate`/`Partial<Task>`). Total errors **7**.

This dispatch bounds scope to: remove the five drifted columns from the orphan  
entity + surgical `FIXME(orphan-task-entity-drift)` at the two compile sites.  
No KPI redesign, no WorkTask migration of this logic, no TasksModule deprecation  
in this PR.

================================================================
DRIFTED COLUMNS TO REMOVE (orphan entity only)
================================================================

File: `zephix-backend/src/modules/tasks/entities/task.entity.ts`

1. `planned_start_date` → property `startDate` (lines ~67–68)  
2. `planned_end_date` → property `endDate` (lines ~70–71)  
3. `vendor_name` → `vendorName`  
4. `resource_impact_score` → `resourceImpactScore`  
5. `assigned_resources` → `assignedResources`  

Surgical removal only. No other entity edits.

================================================================
PHASE 2: SURGICAL FIXME SITES
================================================================

**Distinct tag:** `FIXME(orphan-task-entity-drift)`  
(Do not conflate with PR #250’s `FIXME(task-entity-drift)`.)

**Site A — `kpi.service.ts` (overdue task count)**  
Replace the filter using `t.endDate` with a documented no-op  
`const tasksOverdue = 0` and a block comment explaining: column never existed  
on DB → metric was always 0; follow-up needs canonical dates or another source.  
Reference this dispatch file.

**Site B — `tasks.service.ts` — `adjustDatesForDependency`**  
Replace dependency date adjustment body with early `return` and block comment:  
`startDate`/`endDate` on orphan entity were non-functional; method broken;  
legacy `/tasks` writes may be 410-guarded; follow-up = WorkTask / product  
direction. Reference this dispatch file.

If multiple TS errors share one code site, **one** FIXME block may cover them  
— success criterion is **zero drift-related tsc errors**, not “exactly N FIXME  
comments.”

================================================================
PHASE 3: VERIFICATION (GATE 4 / PR PROOF)
================================================================

```bash
cd zephix-backend
npx tsc --noEmit
npm run build
npm run test:permission-matrix 2>&1 | tail -10
grep -rn "FIXME(orphan-task-entity-drift)" src --include="*.ts" | wc -l
grep -rn "FIXME(task-entity-drift)" src --include="*.ts" | wc -l
```

**HALT if:**  
- `tsc` reports errors outside `kpi.service.ts` / `tasks.service.ts` (beyond  
  pre-recon expectation after entity edit)  
- Permission matrix regresses vs baseline  
- A **fourth** application file must be edited to satisfy compile (scope breach)

**Files expected (implementation commit):** orphan `task.entity.ts`,  
`kpi.service.ts`, `tasks.service.ts` — **3** files.

================================================================
OUT OF SCOPE (PRESERVED FOLLOW-UPS)
================================================================

- KPI metric correctness redesign (overdue from real schedule data)  
- `findByAssignee` replacement / allocation correctness  
- TasksModule + orphan entity full deprecation  
- Dead `.sql` files broader audit  
- Parallel task controllers cleanup  
- **NEW:** Dependency date adjustment correctness (WorkTask or removal)

================================================================
PR DESCRIPTION HOOKS
================================================================

1. Why: Completes entity-layer drift removal PR #250 deferred for the **live**  
   orphan entity; pre-recon grounded blast radius (7 errors, 2 files).  
2. In scope: 5 columns removed; 2 FIXME sites (KPI overdue, dependency dates).  
3. Architectural sequence: #248 → #249 → #250 → **this PR** → PR #8c pen retest →  
   Engine 1 criterion 10.  
4. Cross-refs: PR #250, `docs/ai/SESSION_HANDOFF_2026-05-05.md`,  
   `docs/architecture/V21_RECONCILIATION_2026-05-04.md`.  
5. Post-merge: CI tsc clean on staging; Sentry watch paths 24h.

================================================================
END DISPATCH
================================================================
