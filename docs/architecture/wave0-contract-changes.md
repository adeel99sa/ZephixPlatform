# Wave 0 Contract Changes

API response contract changes introduced during Wave 0 (`work_items` teardown).
Each entry states: what changed, where, when it takes live effect, and what must be updated before that point.

---

## WC-001 — `workspace-health` `recentActivity[].type` format change

**Endpoint:** `GET /api/workspaces/:slug/home` (handled by `WorkspaceHealthService.getExecutionSummary`)

**Change:** The `recentActivity[].type` field previously emitted `WorkItemActivityType` string values (lowercase, e.g. `'created'`, `'status_changed'`, `'assigned'`). After the Wave 0 Step 1 rewire it emits `TaskActivityType` string values (SCREAMING_SNAKE with `TASK_` prefix, e.g. `'TASK_CREATED'`, `'TASK_STATUS_CHANGED'`, `'TASK_ASSIGNED'`).

**Why invisible today:** `work_item_activities` had 0 rows on staging at the time of the rewire (confirmed 2026-06-28). The `recentActivity` array is always `[]` on the current dataset; the format of entries has never been consumed by the frontend with real data.

**When it goes live:** As soon as `task_activities` rows accumulate (i.e., the moment any user creates, updates, or status-changes a task after Wave 0 is deployed).

**Required frontend fix (Cursor's lane):** Wherever `recentActivity[].type` is rendered — switch/case, label map, icon lookup, or display string — update to handle `TaskActivityType` string format. This fix must land **in the same Wave 0 frontend pass** that deletes the work-items zombie chain.

**Commit that introduced the change:** `a9ec8683` (Step 1 rewire, `sprint/wave0-task-consolidation`)

**Status:** Backend done. Frontend update assigned to Cursor Track A pass (same window as zombie deletion).

---
