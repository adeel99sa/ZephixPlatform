/**
 * WaterfallTable — Phase 5B.1 reference Waterfall work surface.
 *
 * Purpose:
 *   Render a project that was created from `pm_waterfall_v2` as a true
 *   row-and-column work surface with the locked 11-column set and the locked
 *   five PMI process-group row groups.
 *
 * Scope (locked by Phase 5B.1 prompt):
 *   - Rendered ONLY when project.methodology === 'waterfall'.
 *     ProjectTasksTab branches into this component; non-Waterfall projects
 *     keep using the existing TaskListSection. No global replacement.
 *   - Real backend behavior only:
 *       Phases:        GET  /work/projects/:id/plan
 *       Tasks:         GET  /work/tasks?projectId=...
 *       Update task:   PATCH /work/tasks/:id  (with the new approvalStatus,
 *                                              documentRequired, remarks
 *                                              wired in Phase 5B.1)
 *       Create task:   POST /work/tasks
 *       Members:       GET  /workspaces/:id/members
 *   - No fake governance, no fake approvals, no fake document upload.
 *     Approval status is a truthful row-level signal (read-write enum); the
 *     "Document required" column is a truthful boolean flag; remarks is a
 *     truthful free-form note. None of these imply that an upload happened
 *     or that an approval workflow ran.
 *
 * Out of scope this phase (intentionally NOT implemented):
 *   - Sub-child rows (the table renders parent + child only this phase).
 *   - SVG dependency lines.
 *   - Drag-reorder of rows.
 *   - Bulk multi-select: fixed viewport bar + header select-all (this file).
 *   - Virtualization (no perf failure observed at MVP scale).
 *   - Mobile editing.
 *   - Admin status-set editing UI (status set is sourced from
 *     `WATERFALL_STATUS_SET` below — see the comment for the documented
 *     edit point for the future admin surface).
 *
 * Keyboard support (locked MVP set):
 *   - ArrowUp / ArrowDown : move row focus
 *   - Enter               : enter edit on the focused editable cell
 *   - Escape              : cancel current edit
 *   - Tab / Shift+Tab     : move horizontally across editable cells
 *   - Space               : toggle milestone on the focused row
 *   No Vim shortcuts. No power-user combinations.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Check,
  Copy,
  Diamond,
  Link,
  Link2,
  Loader2,
  MoreVertical,
  Plus,
  SquareArrowOutUpRight,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  bulkUpdate,
  createTask,
  deleteTask,
  listTasks,
  updateTask,
  listDependencies,
  addDependency,
  removeDependency,
  type WorkTask,
  type WorkTaskStatus,
  type TaskDependency,
} from '@/features/work-management/workTasks.api';
//
// Phase 3 (2026-04-08) — `Link2`, `listDependencies`, `addDependency`,
// `removeDependency`, `TaskDependency` imports above are still consumed by
// the `DependencyPanel` component (kept exported below for future
// re-introduction via the column picker). `WorkTaskPriority` and
// `WorkTaskApprovalStatus` type imports were removed alongside the dropped
// `PRIORITY_OPTIONS` / `APPROVAL_OPTIONS` constants — the underlying enum
// fields on `WorkTask` are still patched via the backend when the
// detail-panel surface lands.
//
import {
  computeCompletionPercent,
  computeDurationDays,
  isClosedStatus,
} from '@/features/work-management/statusBucket';
import { getPhaseColor } from './phaseColors';
import { computePhaseRollup } from './phaseRollups';
import { CustomizeViewPanel } from './CustomizeViewPanel';
import { TaskDetailPanel } from './TaskDetailPanel';
import { updatePhase } from '@/features/work-management/workPhases.api';
import {
  listWorkspaceMembers,
  type WorkspaceMember,
} from '@/features/workspaces/workspace.api';

/* ──────────────────────────────────────────────────────────────────
 * Status set source (Phase 5B.1)
 *
 * The Waterfall table consumes a configurable status-set structure rather
 * than hard-coding a single workflow. In 5B.1 the source is this constant.
 *
 * FUTURE EDIT POINT (admin status-set editing):
 *   When the admin status-set surface ships, replace the body of
 *   `useWaterfallStatusSet()` below to fetch from
 *   GET /workspaces/:id/status-sets?templateCode=pm_waterfall_v2
 *   and fall back to WATERFALL_STATUS_SET on failure. The CONSUMER api
 *   (the hook return type) is intentionally already a list of groups so
 *   that a future admin edit will not require a table rewrite.
 *
 * Backend transition rules in workTasks.api still apply — invalid
 * transitions are filtered client-side AND rejected server-side, so the
 * status set cannot bypass governance.
 * ────────────────────────────────────────────────────────────────── */
type WaterfallStatusOption = {
  value: WorkTaskStatus;
  label: string;
  swatch: string; // tailwind bg color class for the pill
  text: string; // tailwind text class
};
type WaterfallStatusGroup = {
  groupLabel: string;
  options: WaterfallStatusOption[];
};

const WATERFALL_STATUS_SET: WaterfallStatusGroup[] = [
  {
    groupLabel: 'Not started',
    options: [
      { value: 'BACKLOG', label: 'Backlog', swatch: 'bg-slate-200', text: 'text-slate-700' },
      { value: 'TODO', label: 'To do', swatch: 'bg-slate-300', text: 'text-slate-800' },
    ],
  },
  {
    groupLabel: 'Active',
    options: [
      { value: 'IN_PROGRESS', label: 'In progress', swatch: 'bg-blue-500', text: 'text-white' },
      { value: 'IN_REVIEW', label: 'In review', swatch: 'bg-violet-500', text: 'text-white' },
      { value: 'BLOCKED', label: 'Blocked', swatch: 'bg-amber-500', text: 'text-white' },
    ],
  },
  {
    groupLabel: 'Closed',
    options: [
      { value: 'DONE', label: 'Done', swatch: 'bg-emerald-500', text: 'text-white' },
      { value: 'CANCELED', label: 'Canceled', swatch: 'bg-slate-400', text: 'text-white' },
    ],
  },
];

function useWaterfallStatusSet(): WaterfallStatusGroup[] {
  // Constant source in 5B.1 — see edit-point comment above.
  return WATERFALL_STATUS_SET;
}

function findStatusOption(
  groups: WaterfallStatusGroup[],
  value: WorkTaskStatus | string | null | undefined,
): WaterfallStatusOption {
  for (const g of groups) {
    for (const o of g.options) {
      if (o.value === value) return o;
    }
  }
  return {
    value: 'TODO',
    label: String(value ?? 'To do'),
    swatch: 'bg-slate-300',
    text: 'text-slate-800',
  };
}

/* ──────────────────────────────────────────────────────────────────
 * Phase 3 (2026-04-08) — `APPROVAL_OPTIONS` and `PRIORITY_OPTIONS`
 * constants removed alongside the Approval status / Priority columns.
 * The underlying `WorkTask.approvalStatus` and `WorkTask.priority` data
 * still exists on every task and round-trips through the backend; the
 * columns themselves are template-declared in `hiddenColumns` and will
 * surface via the column picker (Phase 4+). When that ships, both
 * constants will return alongside their cell renderers in the same PR.
 * ────────────────────────────────────────────────────────────────── */

/*
 * Phase 12 (2026-04-08) — `PMI_ROW_GROUP_ORDER` removed.
 *
 * The original PMI canonical order was used as the primary sort key for
 * phases by name match (with `sortOrder` as a tiebreaker). That broke
 * the moment a customer renamed a phase: the renamed phase fell out of
 * the canonical list, was assigned the fallback index 1000, and got
 * pushed to the end of the table — even though the user was just
 * relabeling, not reordering. Operator complaint:
 *   "I changed Monitoring and Execution phase to Go-Live it switched
 *    places, Closure came up and Monitoring went down."
 *
 * Fix: sort phases by `phase.sortOrder` only — the durable database
 * column that's set once at instantiation and never changes on rename.
 * Phase reordering (when it ships) will use the existing `POST
 * /work/phases/reorder` endpoint to update sortOrder; renames will
 * never touch it.
 */

/**
 * Phase 5 (2026-04-08) — extended with `reportingKey` so the phase color
 * lookup survives customer renames. The backend `WorkPlanPhaseDto` already
 * exposes `reportingKey` (work-plan.service.ts line 175); previously the
 * frontend just wasn't reading it. With reportingKey present, renaming a
 * phase from "Initiation" to "Project Kickoff" no longer breaks the
 * color palette — the dot stays purple because the lookup keys off the
 * stable identifier, not the display name.
 */
interface WaterfallPhase {
  id: string;
  name: string;
  sortOrder: number;
  reportingKey: string;
  isMilestone: boolean;
}

/* ──────────────────────────────────────────────────────────────────
 * Editable cell coordinates for keyboard nav.
 *
 * Phase 3 (2026-04-08) — locked 8 default columns, matching the backend
 * `pm_waterfall_v2.defaultColumns` declaration in
 * `system-template-definitions.ts`. Five legacy keys (priority, milestone,
 * dependency, approvalStatus, documentRequired) moved out of the default
 * render and into the template's `hiddenColumns` pool — the underlying
 * data still exists on every WorkTask, but the columns are not shown by
 * default. They will be opt-in via the column picker (Phase 4+).
 *
 * `completion` and `duration` are read-only computed columns. Completion
 * derives from status bucket (`computeCompletionPercent` over the row's
 * own status); duration derives from start_date / due_date
 * (`computeDurationDays`). Both come from the shared statusBucket helper
 * which mirrors the backend status-bucket.helper.ts contract.
 * ────────────────────────────────────────────────────────────────── */
type ColumnKey =
  | 'title'
  | 'assignee'
  | 'status'
  | 'startDate'
  | 'dueDate'
  | 'completion'
  | 'duration'
  | 'remarks';

const COLUMN_ORDER: ColumnKey[] = [
  'title',
  'assignee',
  'status',
  'startDate',
  'dueDate',
  'completion',
  'duration',
  'remarks',
];

/**
 * Read-only columns — keyboard Tab traversal skips these (no inline editor).
 *
 * `completion` and `duration` are computed from other fields and have no
 * persistence. Re-introducing manual percentComplete editing post-MVP
 * would remove `completion` from this set.
 *
 * Phase 10 (2026-04-08) — `title` joins this set because title editing
 * has moved entirely into the task detail panel. Clicking the title cell
 * now opens the panel (matching the operator's stated ClickUp-pattern
 * direction); inline title editing in the row is removed. Tab traversal
 * still focuses the title cell but cannot enter an editor — pressing
 * Enter on a focused title opens the panel instead.
 */
const READ_ONLY_COLUMNS: ReadonlySet<ColumnKey> = new Set([
  'title',
  'completion',
  'duration',
]);

/**
 * Phase 4-6 (2026-04-08) — physical (rendered) column count.
 *
 * `COLUMN_ORDER` is the LOGICAL column set — only the 8 data columns
 * the user interacts with for sort/filter/edit. The physical render
 * has TWO extra cells:
 *   - Leftmost: multi-select checkbox (Phase 4)
 *   - Rightmost: row ⋮ actions menu (Phase 6)
 *
 * Both are control cells, not data columns. Every `colSpan` reference
 * in the table body uses this constant so adding a future control
 * column (e.g. a drag handle column) means updating one place, not
 * chasing colSpans.
 */
const PHYSICAL_COLUMN_COUNT = COLUMN_ORDER.length + 2;

interface WaterfallTableProps {
  projectId: string;
  workspaceId: string;
  /** When true, opens the CustomizeViewPanel. Controlled by ProjectTasksTab. */
  customizeViewOpen?: boolean;
  /** Called when the panel requests close. */
  onCustomizeViewClose?: () => void;
  /** Ref to the gear button in ProjectTasksTab — passed to popover click-outside. */
  gearAnchorRef?: React.RefObject<HTMLButtonElement | null>;
}

export const WaterfallTable: React.FC<WaterfallTableProps> = ({
  projectId,
  workspaceId,
  customizeViewOpen: externalOpen,
  onCustomizeViewClose: externalClose,
  gearAnchorRef,
}) => {
  const statusGroups = useWaterfallStatusSet();

  const [phases, setPhases] = useState<WaterfallPhase[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-cell edit state. Only one cell is editing at a time.
  const [editing, setEditing] = useState<{ taskId: string; col: ColumnKey } | null>(null);

  // Inline-add state per phase. Map phaseId -> draft title.
  const [adding, setAdding] = useState<Record<string, string>>({});

  /** Latest `adding` for blur/Enter submit handlers (avoid stale closures). */
  const addingRef = useRef(adding);
  addingRef.current = adding;

  /** Prevents double-submit when Enter is followed immediately by blur. */
  const phaseBottomSubmitLockRef = useRef(false);

  /** Latest tasks for subtask submit (parent lookup). */
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  /** Latest inline subtask slot for blur submit. */
  const addingSubtaskRef = useRef<{
    parentTaskId: string;
    draft: string;
  } | null>(null);

  // Phase 12 (2026-04-08) — Inline subtask add state.
  // Operator wants Add Sub Task to behave exactly like the existing
  // phase-bottom Add task input: click the row ⋮ menu's "Add subtask"
  // item → an inline input appears immediately under the parent row,
  // indented one level deeper. Type a title + Enter creates the
  // subtask and clears the draft. Esc cancels.
  //
  // Single-slot state (not a per-parent map) because only ONE inline
  // subtask add can be active at a time across the whole table — same
  // pattern as the per-cell `editing` state. Opening on a different
  // parent row replaces the previous draft.
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<{
    parentTaskId: string;
    draft: string;
  } | null>(null);

  addingSubtaskRef.current = addingSubtaskFor;

  /** Prevents double-submit on subtask inline input (Enter then blur). */
  const subtaskSubmitLockRef = useRef(false);

  // Row focus for keyboard nav (5B.1A: also tracks focused column for Space).
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [focusedCol, setFocusedCol] = useState<ColumnKey>('title');

  // Phase 4 (2026-04-08) — multi-select state for bulk actions.
  // A Set rather than an array for O(1) membership checks during render.
  // Cleared on phase reload, on bulk action completion, and when the user
  // explicitly clears via the bulk action bar.
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  // Tracks whether a bulk action is in flight so the action bar can disable
  // itself and show a spinner instead of double-firing.
  const [bulkActionPending, setBulkActionPending] = useState(false);

  // Phase 13 (2026-04-08) — Customize View panel state + hidden columns.
  // Operator wants a gear icon that opens a side panel where users can
  // toggle which columns are visible. The hidden-columns Set tracks
  // which of the 8 default columns are currently hidden in the table
  // render. Default state is empty (everything visible). Toggling a
  // column adds/removes its key from the set. The Th and Td render
  // paths in the table check `!hiddenColumnSet.has(key)` before
  // rendering. Title (the row anchor) is hard-locked visible inside
  // the CustomizeViewPanel — toggling it is a no-op.
  const [hiddenColumnSet, setHiddenColumnSet] = useState<Set<ColumnKey>>(
    () => new Set(),
  );

  const toggleColumnVisibility = useCallback((key: ColumnKey) => {
    setHiddenColumnSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Phase 7 (2026-04-08) — task detail panel state.
  // When set to a task id, the side panel renders for that task. The
  // task itself is resolved from the local `tasks` array on each render
  // so any concurrent update (inline edit, bulk action, comment add)
  // flows into the panel without re-fetching. Cleared by the panel's
  // close button, Escape key, or backdrop click.
  const [detailPanelTaskId, setDetailPanelTaskId] = useState<string | null>(
    null,
  );

  // Phase 5 (2026-04-08) — inline phase name editing state.
  // Operator complaint: customers cannot be forced to keep PMI phase
  // names; companies use their own vocabulary for the same lifecycle.
  // Click a phase name → enter edit mode → type → Enter saves, Escape
  // cancels. Only one phase can be in edit mode at a time.
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingPhaseDraft, setEditingPhaseDraft] = useState<string>('');
  const [phaseUpdatePending, setPhaseUpdatePending] = useState(false);

  // Phase 3 (2026-04-08) — Dependency state and side-panel state removed.
  // The Dependency column is no longer in the default 8 (it's in the
  // template's `hiddenColumns` pool for opt-in via the column picker in
  // Phase 4+). Reintroducing the side panel will follow the same pattern
  // it had before — keep that knowledge in `DependencyPanel` (still
  // exported for future use). The Phase 5B.1A per-task `listDependencies`
  // fan-out is also removed from `loadAll` — significantly faster table
  // mount, no more N+1 round-trips.

  /* ---- Initial load ---- */

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [planRes, taskRes, memberRes] = await Promise.all([
        api.get(`/work/projects/${projectId}/plan`, {
          headers: { 'x-workspace-id': workspaceId },
        }),
        // Phase 5B.1A defect fix: backend ListWorkTasksQueryDto enforces
        // @Max(200) on `limit`. The previous `limit: 500` triggered a hard
        // 400 Bad Request the moment WaterfallTable mounted, which is the
        // root cause of the operator's `api/work/tasks?...&limit=500 → 400`
        // console error and the resulting empty / "/404" landing.
        listTasks({ projectId, limit: 200 }),
        listWorkspaceMembers(workspaceId).catch(() => [] as WorkspaceMember[]),
      ]);

      const planPayload =
        ((planRes as any)?.data?.data ?? (planRes as any)?.data ?? planRes) as {
          phases?: Array<{
            id: string;
            name: string;
            sortOrder: number;
            reportingKey?: string;
            isMilestone: boolean;
          }>;
        };
      const rawPhases = planPayload?.phases ?? [];
      setPhases(
        rawPhases.map((p) => ({
          id: p.id,
          name: p.name,
          sortOrder: p.sortOrder,
          reportingKey: p.reportingKey ?? '',
          isMilestone: p.isMilestone,
        })),
      );
      setTasks(taskRes.items);
      setMembers(memberRes ?? []);

      // Phase 3 (2026-04-08) — dependency fan-out removed alongside the
      // Dependency column. See `tasksWithPredecessors` comment above.
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load Waterfall plan');
    } finally {
      setLoading(false);
    }
  }, [projectId, workspaceId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  /* ---- Group tasks by phase, ordered by PMI canonical order ---- */

  // Phase 5B.1A — Render hierarchy three levels deep: parent → child → sub-child.
  // Each rendered row carries its `level` so the title cell can indent.
  type FlatRenderRow = { task: WorkTask; level: 0 | 1 | 2 };

  const grouped = useMemo(() => {
    // Phase 12 (2026-04-08) — Sort phases by `sortOrder` (the durable
    // database column), not by name match against a hardcoded canonical
    // list. Renaming a phase no longer reorders it. See the comment
    // block where `PMI_ROW_GROUP_ORDER` was removed for the rationale.
    const sortedPhases = [...phases].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );

    // Index tasks by parent for fast nesting.
    const childrenOf = new Map<string, WorkTask[]>();
    for (const t of tasks) {
      if (t.deletedAt) continue;
      const key = t.parentTaskId ?? '__ROOT__';
      const arr = childrenOf.get(key) ?? [];
      arr.push(t);
      childrenOf.set(key, arr);
    }
    // Stable rank sort within each parent bucket.
    for (const arr of childrenOf.values()) {
      arr.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    }

    return sortedPhases.map((phase) => {
      const flat: FlatRenderRow[] = [];
      const tops = (childrenOf.get('__ROOT__') ?? []).filter(
        (t) => t.phaseId === phase.id,
      );
      for (const top of tops) {
        flat.push({ task: top, level: 0 });
        const kids = childrenOf.get(top.id) ?? [];
        for (const kid of kids) {
          flat.push({ task: kid, level: 1 });
          const grand = childrenOf.get(kid.id) ?? [];
          for (const g of grand) {
            flat.push({ task: g, level: 2 });
          }
        }
      }
      return { phase, rows: flat };
    });
  }, [phases, tasks]);

  // Flat list of rendered rows in display order — used by keyboard nav.
  const flatRows = useMemo(() => {
    const out: WorkTask[] = [];
    for (const g of grouped) for (const r of g.rows) out.push(r.task);
    return out;
  }, [grouped]);

  /* ---- Optimistic update helper ---- */

  const patchTask = useCallback(
    async (taskId: string, patch: Parameters<typeof updateTask>[1]) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? ({ ...t, ...patch } as WorkTask) : t)),
      );
      try {
        const updated = await updateTask(taskId, patch);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      } catch (err: any) {
        // Re-load on failure to drop the optimistic state. The toast/error
        // banner is intentionally minimal in 5B.1 — no fake "saved" feedback.
        setError(err?.response?.data?.message || err?.message || 'Update failed');
        await loadAll();
      }
    },
    [loadAll],
  );

  /* ---- Bulk action handlers (Phase 4) ---- */

  /**
   * Toggle a single task's selected state. Adds or removes from the
   * selectedTaskIds set without mutating it (React state requires a new
   * Set reference to re-render).
   */
  const toggleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  /**
   * Bulk delete handler. The backend has no `/work/tasks/actions/bulk-delete`
   * endpoint yet (tracked as a known gap in MEMORY.md), so this fans out N
   * parallel `deleteTask` calls. For MVP-scale Waterfall projects (~5-50
   * rows) this is acceptable. When the bulk endpoint ships, replace the
   * Promise.all body with a single bulkDelete call — the consumer logic
   * (state cleanup, error handling, reload) stays the same.
   *
   * Optimistic semantics: tasks are removed from local state immediately
   * for snappy UI; on any error we drop the optimism and reload from the
   * server so the user sees actual state, not a confused mid-state.
   */
  const handleBulkDelete = useCallback(async () => {
    if (selectedTaskIds.size === 0 || bulkActionPending) return;
    const idsToDelete = Array.from(selectedTaskIds);
    const confirmed = window.confirm(
      `Delete ${idsToDelete.length} task${idsToDelete.length === 1 ? '' : 's'}? This cannot be undone from the table.`,
    );
    if (!confirmed) return;
    setBulkActionPending(true);
    // Optimistic removal — drop the deleted ids from local state right away.
    setTasks((prev) => prev.filter((t) => !selectedTaskIds.has(t.id)));
    try {
      await Promise.all(idsToDelete.map((id) => deleteTask(id)));
      clearSelection();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Some tasks could not be deleted. Reloading.',
      );
      // Drop optimistic state and reload truth from the server.
      await loadAll();
      clearSelection();
    } finally {
      setBulkActionPending(false);
    }
  }, [selectedTaskIds, bulkActionPending, loadAll, clearSelection]);

  /* ---- Detail panel open/close (Phase 7) ---- */

  const openDetailPanel = useCallback((taskId: string) => {
    setDetailPanelTaskId(taskId);
  }, []);

  const closeDetailPanel = useCallback(() => {
    setDetailPanelTaskId(null);
  }, []);

  /* ---- Inline add subtask from row ⋮ menu (Phase 12) ---- */

  /**
   * Open the inline subtask input for a parent task. Replaces any
   * draft that was open on a different parent — only one inline
   * subtask add at a time. Called from the row ⋮ menu's "Add subtask"
   * item.
   */
  const startInlineSubtaskAdd = useCallback((parentTaskId: string) => {
    setAddingSubtaskFor({ parentTaskId, draft: '' });
  }, []);

  const cancelInlineSubtaskAdd = useCallback(() => {
    setAddingSubtaskFor(null);
  }, []);

  /* ---- Add subtask from detail panel (Phase 8) ---- */

  /**
   * Create a subtask under the given parent. The new subtask inherits
   * the parent's phaseId so it appears in the same phase group, and gets
   * a fresh title from the user. Phase 8 closes the gap that previously
   * blocked Add subtask creation: the frontend `CreateTaskInput` type
   * now exposes `parentTaskId` and `createTask` forwards it to the
   * backend (which already accepted it via `CreateWorkTaskDto`).
   *
   * Optimistic semantics: append to local `tasks` state immediately,
   * adopt the server response when it returns, drop optimism + reload
   * on error. Identical pattern to handleDuplicateTask.
   */
  const handleAddSubtask = useCallback(
    async (parent: WorkTask, title: string): Promise<WorkTask | null> => {
      const trimmed = title.trim();
      if (!trimmed) return null;
      try {
        const created = await createTask({
          projectId,
          title: trimmed,
          parentTaskId: parent.id,
          phaseId: parent.phaseId ?? undefined,
        });
        setTasks((prev) => [...prev, created]);
        return created;
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Could not add subtask',
        );
        await loadAll();
        return null;
      }
    },
    [projectId, loadAll],
  );

  /**
   * Commit inline subtask draft (Enter, blur with text). Uses refs + lock so
   * Enter→blur does not create twice. Empty blur closes without creating.
   */
  const submitInlineSubtaskAdd = useCallback(async () => {
    const slot = addingSubtaskRef.current;
    if (!slot) return;
    if (subtaskSubmitLockRef.current) return;
    const title = slot.draft.trim();
    if (!title) {
      setAddingSubtaskFor(null);
      return;
    }
    const parent = tasksRef.current.find((t) => t.id === slot.parentTaskId);
    if (!parent) {
      setAddingSubtaskFor(null);
      return;
    }
    subtaskSubmitLockRef.current = true;
    try {
      const created = await handleAddSubtask(parent, title);
      if (created) {
        setAddingSubtaskFor(null);
      }
    } finally {
      subtaskSubmitLockRef.current = false;
    }
  }, [handleAddSubtask]);

  /* ---- Single-row actions (Phase 6) ---- */

  /**
   * Duplicate a single task. Clones the source task's editable fields
   * (title with " (copy)" suffix, phase membership, assignee, dates,
   * priority, description, tags) into a fresh task. The new task gets
   * its own id, status TODO, and zero subtask history — duplicate is
   * intentionally a "create a sibling" operation, not a deep clone of
   * a hierarchy. When the task detail panel ships (Phase 7), a deep
   * clone option can be added there for power users.
   *
   * Optimistic semantics: append to local state immediately, replace
   * with server response when it returns. On failure, drop the optimism
   * and reload truth from server.
   */
  const handleDuplicateTask = useCallback(
    async (source: WorkTask) => {
      try {
        const created = await createTask({
          projectId,
          title: `${source.title} (copy)`,
          phaseId: source.phaseId ?? undefined,
          assigneeUserId: source.assigneeUserId ?? undefined,
          dueDate: source.dueDate ?? undefined,
          priority: source.priority,
          description: source.description ?? undefined,
          tags: source.tags ?? undefined,
        });
        setTasks((prev) => [...prev, created]);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Could not duplicate task',
        );
        await loadAll();
      }
    },
    [projectId, loadAll],
  );

  /**
   * Delete a single task. Same confirmation pattern as bulk delete but
   * tighter copy ("Delete this task?"). Optimistic removal + reload on
   * error. Removes from selection set as a side effect (covers the
   * case where the user deletes a row that was multi-selected).
   */
  const handleDeleteSingleTask = useCallback(
    async (task: WorkTask) => {
      const confirmed = window.confirm(
        `Delete "${task.title}"? This cannot be undone from the table.`,
      );
      if (!confirmed) return;
      // Optimistic removal.
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setSelectedTaskIds((prev) => {
        if (!prev.has(task.id)) return prev;
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
      try {
        await deleteTask(task.id);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Could not delete task',
        );
        await loadAll();
      }
    },
    [loadAll],
  );

  const handleCopyTaskLink = useCallback(
    async (taskId: string) => {
      const url = `${window.location.origin}/projects/${projectId}?taskId=${taskId}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      } catch {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = url;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          toast.success('Link copied');
        } catch {
          toast.error('Could not copy link');
        }
      }
    },
    [projectId],
  );

  /* ---- Bulk Status / Assignee changes (Phase 6) ---- */

  /**
   * Apply a bulk status change to every selected task. Uses the existing
   * `bulkUpdate` endpoint — backend already enforces the same status
   * transition rules per task (invalid transitions are rejected
   * server-side). Optimistic update with reload-on-error fallback.
   */
  const handleBulkSetStatus = useCallback(
    async (status: WorkTaskStatus) => {
      if (selectedTaskIds.size === 0 || bulkActionPending) return;
      const ids = Array.from(selectedTaskIds);
      setBulkActionPending(true);
      // Optimistic local update.
      setTasks((prev) =>
        prev.map((t) => (selectedTaskIds.has(t.id) ? { ...t, status } : t)),
      );
      try {
        await bulkUpdate({ taskIds: ids, status });
        clearSelection();
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Bulk status change failed',
        );
        await loadAll();
        clearSelection();
      } finally {
        setBulkActionPending(false);
      }
    },
    [selectedTaskIds, bulkActionPending, loadAll, clearSelection],
  );

  /**
   * Apply a bulk assignee change. `null` clears the assignee on every
   * selected task. Same optimistic + reload-on-error pattern.
   */
  const handleBulkSetAssignee = useCallback(
    async (assigneeUserId: string | null) => {
      if (selectedTaskIds.size === 0 || bulkActionPending) return;
      const ids = Array.from(selectedTaskIds);
      setBulkActionPending(true);
      setTasks((prev) =>
        prev.map((t) =>
          selectedTaskIds.has(t.id) ? { ...t, assigneeUserId } : t,
        ),
      );
      try {
        await bulkUpdate({ taskIds: ids, assigneeUserId });
        clearSelection();
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Bulk assignee change failed',
        );
        await loadAll();
        clearSelection();
      } finally {
        setBulkActionPending(false);
      }
    },
    [selectedTaskIds, bulkActionPending, loadAll, clearSelection],
  );

  /* ---- Phase name inline edit (Phase 5) ---- */

  const startEditingPhase = useCallback((phase: WaterfallPhase) => {
    setEditingPhaseId(phase.id);
    setEditingPhaseDraft(phase.name);
  }, []);

  const cancelEditingPhase = useCallback(() => {
    setEditingPhaseId(null);
    setEditingPhaseDraft('');
  }, []);

  /**
   * Commit a phase rename. Optimistic update so the rename feels instant;
   * on failure we drop the optimism by reloading from the server. The
   * `reportingKey` is left untouched — only `name` changes — so phase
   * colors continue to resolve correctly after the rename. This is
   * exactly the property that makes "I cannot force customers to use
   * PMI names" safe: the display label is mutable, the structural
   * identifier is stable.
   */
  const commitPhaseRename = useCallback(
    async (phaseId: string, nextName: string) => {
      const trimmed = nextName.trim();
      if (!trimmed) {
        cancelEditingPhase();
        return;
      }
      const current = phases.find((p) => p.id === phaseId);
      if (!current || current.name === trimmed) {
        cancelEditingPhase();
        return;
      }
      setPhaseUpdatePending(true);
      // Optimistic local rename.
      setPhases((prev) =>
        prev.map((p) => (p.id === phaseId ? { ...p, name: trimmed } : p)),
      );
      try {
        const updated = await updatePhase(phaseId, { name: trimmed });
        // Server is the source of truth — adopt its returned name in case
        // the backend normalized it (e.g. trimmed whitespace differently).
        setPhases((prev) =>
          prev.map((p) =>
            p.id === phaseId
              ? {
                  ...p,
                  name: updated.name,
                  reportingKey: updated.reportingKey || p.reportingKey,
                  isMilestone: updated.isMilestone,
                }
              : p,
          ),
        );
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Phase rename failed',
        );
        // Drop optimism and reload from server.
        await loadAll();
      } finally {
        setPhaseUpdatePending(false);
        setEditingPhaseId(null);
        setEditingPhaseDraft('');
      }
    },
    [phases, loadAll, cancelEditingPhase],
  );

  /* ---- Add task inline (phase bottom + blur-to-save, PR #133) ---- */

  const submitPhaseBottomTask = useCallback(
    async (phaseId: string) => {
      if (phaseBottomSubmitLockRef.current) return;
      const title = (addingRef.current[phaseId] ?? '').trim();
      if (!title) return;
      phaseBottomSubmitLockRef.current = true;
      try {
        const created = await createTask({ projectId, title, phaseId });
        setTasks((prev) => [...prev, created]);
        setAdding((prev) => ({ ...prev, [phaseId]: '' }));
        requestAnimationFrame(() => {
          document
            .querySelector<HTMLInputElement>(`[data-phase-input="${phaseId}"]`)
            ?.focus();
        });
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Could not add task');
      } finally {
        phaseBottomSubmitLockRef.current = false;
      }
    },
    [projectId],
  );

  /* ---- Keyboard nav ---- */

  // Phase 5B.1A — status cycle helper used by Space when status cell focused.
  const cycleStatus = useCallback(
    (current: WorkTaskStatus): WorkTaskStatus => {
      // Cycle through the locked status set in display order, skipping
      // any value that the backend would reject as an invalid transition.
      const flat: WorkTaskStatus[] = [];
      for (const g of statusGroups) for (const o of g.options) flat.push(o.value);
      const idx = flat.indexOf(current);
      for (let i = 1; i <= flat.length; i++) {
        const next = flat[(idx + i) % flat.length];
        if (next === current) continue;
        // We let the backend reject invalid transitions; the optimistic
        // `patchTask` reload-on-error handles rollback truthfully.
        return next;
      }
      return current;
    },
    [statusGroups],
  );

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableRowElement>, task: WorkTask) => {
      if (editing) return; // editor handles its own keys
      const idx = flatRows.findIndex((t) => t.id === task.id);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = flatRows[Math.min(idx + 1, flatRows.length - 1)];
        if (next) setFocusedTaskId(next.id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = flatRows[Math.max(idx - 1, 0)];
        if (prev) setFocusedTaskId(prev.id);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        // Phase 10 (2026-04-08) — Enter behavior depends on focused col:
        //   - Read-only cells (title / completion / duration) → open
        //     the task detail panel. This pairs with the click behavior:
        //     clicking the title cell also opens the panel. Title is
        //     no longer inline-editable from the table.
        //   - Editable cells → enter inline edit (existing behavior).
        // The READ_ONLY_COLUMNS set is the single source of truth for
        // which columns can be edited inline; this branch defers to it.
        if (READ_ONLY_COLUMNS.has(focusedCol)) {
          openDetailPanel(task.id);
        } else {
          setEditing({ taskId: task.id, col: focusedCol });
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        // Phase 3 (2026-04-08) — locked Space behavior:
        //   focused status cell → cycle to next status (real PATCH)
        //   anywhere else       → no-op (do not invent a default action)
        // The Phase 5B.1A milestone-toggle branch was removed because the
        // Milestone column is no longer in the default 8-column set.
        // Milestone is a task TYPE (locked architectural decision), not a
        // per-row column toggle. Marking a task as a milestone moves to the
        // task detail panel + "Convert to milestone" row-⋮ action in
        // future phases.
        if (focusedCol === 'status') {
          e.preventDefault();
          const next = cycleStatus(task.status);
          if (next !== task.status) void patchTask(task.id, { status: next });
        }
      } else if (e.key === 'Tab') {
        // Allow native focus traversal across cell editors.
      }
    },
    [editing, flatRows, focusedCol, patchTask, cycleStatus, openDetailPanel],
  );

  const moveEditingHorizontal = useCallback(
    (direction: 1 | -1) => {
      if (!editing) return;
      const colIdx = COLUMN_ORDER.indexOf(editing.col);
      let next = colIdx + direction;
      while (next >= 0 && next < COLUMN_ORDER.length) {
        const candidate = COLUMN_ORDER[next];
        // Phase 3 — skip read-only computed columns (completion, duration)
        // when tabbing. Their values come from other fields, not from
        // user input.
        if (!READ_ONLY_COLUMNS.has(candidate)) {
          setEditing({ taskId: editing.taskId, col: candidate });
          return;
        }
        next += direction;
      }
      setEditing(null);
    },
    [editing],
  );

  /* ---- Render ---- */

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" data-testid="waterfall-table-loading">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        data-testid="waterfall-table-error"
      >
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
        <button
          type="button"
          onClick={() => void loadAll()}
          className="ml-auto rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
        >
          Retry
        </button>
      </div>
    );
  }

  // Phase 13 — dynamic visible column count for colSpan refs.
  // PHYSICAL_COLUMN_COUNT is the maximum (COLUMN_ORDER.length + 2 for
  // checkbox + ⋮); the actual visible cell count is reduced by however
  // many columns the user has hidden via the Customize View panel.
  // Phase header / add task / empty-state colSpans use this dynamic
  // count so the spans remain accurate regardless of hide state.
  const visiblePhysicalColumnCount =
    PHYSICAL_COLUMN_COUNT - hiddenColumnSet.size;

  return (
    <div data-testid="waterfall-table-container">
      {/* Toolbar — gear icon lifted to ProjectTasksTab. Future: filters, search. */}
      <div
        className="overflow-x-auto rounded-lg border border-slate-200 bg-white"
        data-testid="waterfall-table"
      >
      <table className="min-w-[1280px] w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          {/*
           * Phase 3 — locked 8 default columns matching pm_waterfall_v2.
           * Dropped from defaults: Owner (renamed to Assignee), Priority,
           * Milestone, Dependency, Approval status, Document required.
           * These remain in the data model and are template-declared in
           * `hiddenColumns`, surfaced via the column picker in Phase 4+.
           *
           * Phase 4 — leftmost checkbox column added for multi-select.
           * Not part of `COLUMN_ORDER` (it isn't an editable data column);
           * physical column count is therefore `COLUMN_ORDER.length + 1`.
           * `PHYSICAL_COLUMN_COUNT` is used by every `colSpan` reference
           * below so adding a future control column means updating one
           * constant, not chasing colSpans.
           */}
          <tr>
            <Th className="w-[36px] px-2">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                checked={
                  flatRows.length > 0 &&
                  selectedTaskIds.size > 0 &&
                  selectedTaskIds.size === flatRows.length
                }
                onChange={() => {
                  if (flatRows.length === 0) return;
                  if (selectedTaskIds.size === flatRows.length) {
                    setSelectedTaskIds(new Set());
                  } else {
                    setSelectedTaskIds(new Set(flatRows.map((t) => t.id)));
                  }
                }}
                aria-label="Select all tasks"
              />
            </Th>
            {/* Phase 13 — title is hard-locked visible (row anchor). */}
            <Th>Tasks</Th>
            {!hiddenColumnSet.has('assignee') && <Th className="w-[160px]">Assignee</Th>}
            {!hiddenColumnSet.has('status') && <Th className="w-[140px]">Status</Th>}
            {!hiddenColumnSet.has('startDate') && <Th className="w-[130px]">Start date</Th>}
            {!hiddenColumnSet.has('dueDate') && <Th className="w-[130px]">Due date</Th>}
            {!hiddenColumnSet.has('completion') && <Th className="w-[140px]">Completion</Th>}
            {!hiddenColumnSet.has('duration') && <Th className="w-[110px]">Duration (days)</Th>}
            {!hiddenColumnSet.has('remarks') && <Th className="w-[200px]">Remarks</Th>}
            {/* Phase 6 — trailing row-actions ⋮ menu column. */}
            <Th className="w-[36px] px-2" />
          </tr>
        </thead>
        <tbody>
          {grouped.map(({ phase, rows }) => {
            // Phase 4 — direct (level-0) children of this phase. The
            // rollup intentionally excludes subtasks/grandchildren —
            // see `phaseRollups.ts` for the rationale.
            const directChildren = rows
              .filter((r) => r.level === 0)
              .map((r) => r.task);
            const rollup = computePhaseRollup(directChildren);
            const phaseColor = getPhaseColor(phase);
            return (
            <React.Fragment key={phase.id}>
              <tr
                className="group bg-slate-50/80 border-y border-slate-200"
                data-testid={`waterfall-row-group-${phase.name}`}
              >
                <td
                  colSpan={visiblePhysicalColumnCount}
                  className="px-4 py-3"
                >
                  {/*
                   * Phase 4 phase header: color dot + name + count badge +
                   * duration badge + completion bar tinted with the phase
                   * color. Matches the operator's mockup aesthetic.
                   * PR #133: `group` enables hover-revealed "+ Add task" control.
                   */}
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: phaseColor }}
                      aria-hidden
                    />
                    {/*
                     * Phase 5 — inline phase name editor.
                     * Click the name to enter edit mode. Enter saves,
                     * Escape cancels, blur saves (matches the existing
                     * inline task title editor behavior). The
                     * `reportingKey` stays put — only the display name
                     * changes — so the phase color and any governance
                     * keying off the structural identifier survive
                     * customer renames.
                     */}
                    {editingPhaseId === phase.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingPhaseDraft}
                        disabled={phaseUpdatePending}
                        onChange={(e) => setEditingPhaseDraft(e.target.value)}
                        onBlur={() =>
                          void commitPhaseRename(phase.id, editingPhaseDraft)
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void commitPhaseRename(phase.id, editingPhaseDraft);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEditingPhase();
                          }
                        }}
                        className="text-sm font-semibold text-slate-800 bg-white border border-blue-300 rounded px-2 py-0.5 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
                        data-testid={`phase-name-input-${phase.id}`}
                        aria-label="Edit phase name"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditingPhase(phase)}
                        className="text-sm font-semibold text-slate-800 hover:text-blue-700 hover:underline focus:outline-none focus:underline"
                        data-testid={`phase-name-${phase.id}`}
                        aria-label={`Edit phase name: ${phase.name}`}
                        title="Click to rename phase"
                      >
                        {phase.name}
                      </button>
                    )}
                    {phase.isMilestone && (
                      <Diamond className="h-3 w-3 text-amber-500" aria-label="Milestone phase" />
                    )}
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                      data-testid={`phase-task-count-${phase.name}`}
                    >
                      {rollup.taskCount} task{rollup.taskCount === 1 ? '' : 's'}
                    </span>
                    {rollup.durationDays > 0 && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                        data-testid={`phase-duration-${phase.name}`}
                      >
                        {rollup.durationDays} day{rollup.durationDays === 1 ? '' : 's'}
                      </span>
                    )}
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      data-testid={`phase-header-add-task-${phase.id}`}
                      aria-label={`Add task in ${phase.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const el = document.querySelector<HTMLInputElement>(
                          `[data-phase-input="${phase.id}"]`,
                        );
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          el.focus();
                        }
                      }}
                    >
                      <Plus className="h-3 w-3 shrink-0" aria-hidden />
                      Add task
                    </button>
                    <div className="flex items-center gap-2 ml-auto min-w-[140px]">
                      <div className="h-1.5 flex-1 max-w-[120px] rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${rollup.completionPercent}%`,
                            backgroundColor: phaseColor,
                          }}
                          aria-hidden
                        />
                      </div>
                      <span
                        className="text-[11px] tabular-nums text-slate-600 w-9 text-right"
                        data-testid={`phase-completion-${phase.name}`}
                      >
                        {rollup.completionPercent}%
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
              {rows.map(({ task, level }) => (
                <React.Fragment key={task.id}>
                  <WaterfallRow
                    task={task}
                    level={level}
                    members={members}
                    statusGroups={statusGroups}
                    hiddenColumns={hiddenColumnSet}
                    focused={focusedTaskId === task.id}
                    focusedCol={focusedTaskId === task.id ? focusedCol : null}
                    editing={editing && editing.taskId === task.id ? editing.col : null}
                    selected={selectedTaskIds.has(task.id)}
                    onToggleSelect={() => toggleSelectTask(task.id)}
                    onViewDetails={() => openDetailPanel(task.id)}
                    onAddSubtask={() => startInlineSubtaskAdd(task.id)}
                    onDuplicate={() => void handleDuplicateTask(task)}
                    onCopyTaskLink={() => void handleCopyTaskLink(task.id)}
                    onDelete={() => void handleDeleteSingleTask(task)}
                    onFocusRow={() => setFocusedTaskId(task.id)}
                    onFocusCell={(col) => {
                      setFocusedTaskId(task.id);
                      setFocusedCol(col);
                    }}
                    onStartEdit={(col) => setEditing({ taskId: task.id, col })}
                    onCancelEdit={() => setEditing(null)}
                    onCommit={async (col, value) => {
                      const patch = buildPatch(col, value);
                      if (patch) await patchTask(task.id, patch);
                      setEditing(null);
                    }}
                    onMoveEditing={moveEditingHorizontal}
                    onRowKeyDown={(e) => handleRowKeyDown(e, task)}
                  />
                  {/*
                   * Phase 12 — Inline subtask input row.
                   * Renders directly under the parent row when the row
                   * ⋮ menu's "Add subtask" item was clicked. Indented
                   * to `level + 1` to visually anchor to the parent.
                   * Enter saves, Escape cancels, blur saves when non-empty
                   * (matches phase-bottom Add task). Disabled depth limit: subtasks can nest at
                   * level 0→1, 1→2; the existing render only supports
                   * 3 levels (0/1/2), so trying to add a sub-subtask
                   * under a level-2 row is gracefully blocked at the
                   * render level (input renders but it'll be at level 3
                   * which the row component clamps).
                   */}
                  {addingSubtaskFor?.parentTaskId === task.id && (
                    <tr
                      className="bg-blue-50/30"
                      data-testid={`waterfall-inline-subtask-row-${task.id}`}
                    >
                      <td colSpan={visiblePhysicalColumnCount} className="border-t border-slate-100 px-4 py-2">
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${(level + 1) * 18 + 36}px` }}
                        >
                          <Plus className="h-3.5 w-3.5 text-blue-500" />
                          <input
                            type="text"
                            autoFocus
                            value={addingSubtaskFor.draft}
                            onChange={(e) =>
                              setAddingSubtaskFor((prev) =>
                                prev
                                  ? { ...prev, draft: e.target.value }
                                  : prev,
                              )
                            }
                            onBlur={() => {
                              void submitInlineSubtaskAdd();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void submitInlineSubtaskAdd();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelInlineSubtaskAdd();
                              }
                            }}
                            placeholder="Subtask name (Enter to save, Esc to cancel)"
                            className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                            data-testid={`waterfall-inline-subtask-input-${task.id}`}
                            aria-label="Add subtask"
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {/* Inline Add task row, locked at the bottom of each row group. */}
              <tr data-testid={`waterfall-add-row-${phase.name}`}>
                <td colSpan={visiblePhysicalColumnCount} className="border-t border-slate-100 px-4 py-2">
                  <div className="flex items-center gap-2 pl-9">
                    <Plus className="h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      data-phase-input={phase.id}
                      value={adding[phase.id] ?? ''}
                      placeholder="Add task"
                      onChange={(e) =>
                        setAdding((prev) => ({ ...prev, [phase.id]: e.target.value }))
                      }
                      onBlur={() => {
                        void submitPhaseBottomTask(phase.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void submitPhaseBottomTask(phase.id);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          setAdding((prev) => ({ ...prev, [phase.id]: '' }));
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                      data-testid={`waterfall-add-input-${phase.name}`}
                    />
                  </div>
                </td>
              </tr>
            </React.Fragment>
            );
          })}
          {grouped.length === 0 && (
            <tr>
              <td
                colSpan={visiblePhysicalColumnCount}
                className="px-4 py-12 text-center text-sm text-slate-500"
              >
                This Waterfall project has no row groups yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {/*
       * Phase 3 (2026-04-08) — DependencyPanel render removed alongside the
       * Dependency column. The component definition is preserved further
       * down in this file so it can be re-mounted when the column picker
       * (Phase 4+) lets users opt the Dependency column back in. No
       * dangling state, no orphaned imports — when the column returns,
       * `depPanelTaskId` state, the open handler, and this render block
       * all come back together as one cohesive feature.
       */}
      </div>

      {/*
       * Phase 7 — Task detail side panel.
       * MUST live outside the horizontal scroll wrapper: `fixed` backdrop +
       * panel inside `overflow-x-auto` clips / swallows interactions with
       * the table in some layouts (Activities tab felt “empty” / unusable).
       */}
      {detailPanelTaskId &&
        (() => {
          const detailTask = tasks.find((t) => t.id === detailPanelTaskId);
          if (!detailTask) {
            queueMicrotask(closeDetailPanel);
            return null;
          }
          const detailPhaseName =
            phases.find((p) => p.id === detailTask.phaseId)?.name ?? '';
          const detailSubtasks = tasks.filter(
            (t) => t.parentTaskId === detailTask.id && !t.deletedAt,
          );
          return (
            <TaskDetailPanel
              task={detailTask}
              phaseName={detailPhaseName}
              phases={phases}
              members={members}
              statusGroups={statusGroups}
              subtasks={detailSubtasks}
              onPatch={patchTask}
              onOpenTask={openDetailPanel}
              onAddSubtask={(title) => handleAddSubtask(detailTask, title)}
              onClose={closeDetailPanel}
            />
          );
        })()}

      {/*
       * Bulk action bar — portaled to document.body; fixed bottom-center.
       * Three actions: Status, Assignee, Delete (+ count + clear). White bar.
       */}
      {typeof document !== 'undefined' &&
        selectedTaskIds.size > 0 &&
        createPortal(
          <div
            className="fixed bottom-6 left-1/2 z-50 flex max-w-[min(100vw-2rem,56rem)] -translate-x-1/2 flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-lg"
            data-testid="waterfall-bulk-action-bar"
          >
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-medium text-slate-700">
                {selectedTaskIds.size} selected
              </span>
              <button
                type="button"
                onClick={clearSelection}
                disabled={bulkActionPending}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Clear selection"
                data-testid="waterfall-bulk-clear"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                Status
              </span>
              <select
                value=""
                disabled={bulkActionPending}
                onChange={(e) => {
                  const v = e.target.value as WorkTaskStatus;
                  if (!v) return;
                  void handleBulkSetStatus(v);
                  e.target.value = '';
                }}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
                data-testid="waterfall-bulk-status"
                aria-label="Set status for selected tasks"
              >
                <option value="">Choose…</option>
                {statusGroups.flatMap((group) =>
                  group.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  )),
                )}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                Assignee
              </span>
              <select
                value=""
                disabled={bulkActionPending}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') return;
                  const next = raw === '__none__' ? null : raw;
                  void handleBulkSetAssignee(next);
                  e.target.value = '';
                }}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
                data-testid="waterfall-bulk-assignee"
                aria-label="Set assignee for selected tasks"
              >
                <option value="">Choose…</option>
                <option value="__none__">Unassigned</option>
                {members.map((m: any) => {
                  const u = m.user ?? {};
                  const id = m.userId ?? u.id ?? m.id;
                  const full = [u.firstName, u.lastName]
                    .filter(Boolean)
                    .join(' ')
                    .trim();
                  const label =
                    full || u.name || m.name || u.email || m.email || 'Member';
                  return (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              type="button"
              onClick={() => void handleBulkDelete()}
              disabled={bulkActionPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="waterfall-bulk-delete"
            >
              {bulkActionPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete
            </button>
          </div>,
          document.body,
        )}

      {/*
       * Phase 13 — Customize View side panel.
       * Opens when the gear icon in the toolbar above the table is
       * clicked. Hosts the Fields tab (column show/hide) and the
       * View tab (filter/group/sort — coming soon). Closes via X
       * button, Escape, or backdrop click. Outside the inner table
       * div so the backdrop overlay covers the table cleanly.
       */}
      {externalOpen && (
        <CustomizeViewPanel
          hiddenColumns={hiddenColumnSet}
          onToggleColumn={toggleColumnVisibility}
          onClose={() => externalClose?.()}
          anchorRef={gearAnchorRef}
        />
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
 * Cell helpers
 * ────────────────────────────────────────────────────────────────── */
function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 font-medium ${className ?? ''}`}>{children}</th>;
}

function Td({
  children,
  focused,
  testId,
  onClick,
}: {
  children: React.ReactNode;
  focused?: boolean;
  testId?: string;
  onClick?: () => void;
}) {
  return (
    <td
      className={`border-b border-slate-100 px-3 py-2 align-middle ${
        focused ? 'bg-blue-50/40' : ''
      }`}
      data-testid={testId}
      onClick={onClick}
    >
      {children}
    </td>
  );
}

/**
 * Phase 3 (2026-04-08) — patch builder for the locked 8-column edit set.
 *
 * The 5 dropped columns (priority, milestone, dependency, approvalStatus,
 * documentRequired) are no longer editable from the table — their data
 * still exists on WorkTask and is patched via other surfaces (the task
 * detail panel, dependency side panel, milestone toggle in the row-⋮ menu)
 * which arrive in later phases.
 *
 * `completion` and `duration` are computed read-only columns and never
 * patch — they have no case here. The `READ_ONLY_COLUMNS` set above
 * prevents Tab traversal from ever reaching them in edit mode.
 */
function buildPatch(col: ColumnKey, value: any): Parameters<typeof updateTask>[1] | null {
  switch (col) {
    case 'status':
      return { status: value };
    case 'assignee':
      return { assigneeUserId: value || null };
    case 'startDate':
      return { startDate: value || null };
    case 'dueDate':
      return { dueDate: value || null };
    case 'remarks':
      return { remarks: value === '' ? null : value };
    case 'title':
    case 'completion':
    case 'duration':
      // Phase 10 (2026-04-08) — `title` is no longer edited from the
      // table cell; clicking the title opens the task detail panel and
      // editing happens there. The case is kept (rather than removed)
      // so the buildPatch switch remains exhaustive over `ColumnKey`
      // and any future stray `onCommit('title', value)` call (e.g.
      // from a keyboard nav regression) returns null instead of
      // silently issuing a malformed PATCH.
      // `completion` and `duration` are computed read-only columns.
      return null;
    default:
      return null;
  }
}

/* ──────────────────────────────────────────────────────────────────
 * Row component — Phase 3 locked 8-column render + inline editors
 *
 * Columns: title, assignee, status, startDate, dueDate, completion,
 *          duration, remarks
 *
 * Read-only computed columns: completion (from status bucket), duration
 * (from start/due dates). These have no inline editor and are skipped
 * by Tab traversal via READ_ONLY_COLUMNS in the parent component.
 * ────────────────────────────────────────────────────────────────── */
interface RowProps {
  task: WorkTask;
  /** Phase 5B.1A — 0=top, 1=child, 2=sub-child */
  level: 0 | 1 | 2;
  members: WorkspaceMember[];
  statusGroups: WaterfallStatusGroup[];
  /** Phase 13 — set of column keys hidden via Customize View. */
  hiddenColumns: Set<ColumnKey>;
  focused: boolean;
  /** Phase 5B.1A — focused column on this row, used by Space handler */
  focusedCol: ColumnKey | null;
  editing: ColumnKey | null;
  /** Phase 4 — multi-select state */
  selected: boolean;
  onToggleSelect: () => void;
  /** Phase 7 — open the task detail side panel */
  onViewDetails: () => void;
  /** Phase 12 — open inline subtask input under this row */
  onAddSubtask: () => void;
  /** Phase 6 — single-row actions from the ⋮ menu */
  onDuplicate: () => void;
  onCopyTaskLink: () => void;
  onDelete: () => void;
  onFocusRow: () => void;
  onFocusCell: (col: ColumnKey) => void;
  onStartEdit: (col: ColumnKey) => void;
  onCancelEdit: () => void;
  onCommit: (col: ColumnKey, value: any) => Promise<void> | void;
  onMoveEditing: (direction: 1 | -1) => void;
  onRowKeyDown: (e: React.KeyboardEvent<HTMLTableRowElement>) => void;
}

const WaterfallRow: React.FC<RowProps> = ({
  task,
  level,
  members,
  statusGroups,
  hiddenColumns,
  focused,
  focusedCol,
  editing,
  selected,
  onToggleSelect,
  onViewDetails,
  onAddSubtask,
  onDuplicate,
  onCopyTaskLink,
  onDelete,
  onFocusRow,
  onFocusCell,
  onStartEdit,
  onCancelEdit,
  onCommit,
  onMoveEditing,
  onRowKeyDown,
}) => {
  // Phase 6 — row ⋮ action menu open state. Local to each row so multiple
  // rows don't fight over a single open menu. Closes on outside-click via
  // an effect that listens for mousedown anywhere outside the menu wrapper.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);
  const statusOpt = findStatusOption(statusGroups, task.status);

  // Phase 3 — computed read-only column values.
  // Completion: per-task today (uses bucket-based single-status compute).
  // When Phase 4 introduces phase-rows-as-derived-task-rows, the same
  // function is called with the phase's children's statuses for rollup.
  const completionPercent = computeCompletionPercent([task.status]);
  const durationDays = computeDurationDays(task.startDate, task.dueDate);

  const memberLabel = (id: string | null): string => {
    if (!id) return 'Unassigned';
    const m = members.find(
      (mm: any) => (mm.userId ?? mm.user?.id ?? mm.id) === id,
    ) as any;
    if (!m) return 'Unknown';
    const u = m.user ?? {};
    const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return full || u.name || m.name || u.email || m.email || 'Member';
  };

  return (
    <tr
      tabIndex={0}
      onFocus={onFocusRow}
      onKeyDown={onRowKeyDown}
      data-task-id={task.id}
      data-focused={focused ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
      className={`group outline-none ${
        selected
          ? 'bg-blue-50/60'
          : focused
            ? 'bg-blue-50/40'
            : 'hover:bg-slate-50'
      }`}
    >
      {/*
       * Phase 4 — Multi-select checkbox.
       * Visibility: always visible when the row is selected; otherwise
       * fades in on row hover (group-hover from the parent <tr>). This
       * matches the operator's mockup pattern of hover-revealed row
       * controls without forcing a permanent visual on every row.
       * Stop-propagation prevents the row's tabIndex focus handler from
       * also firing and stealing focus on click.
       */}
      <Td focused={focused}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${task.title}`}
          data-testid={`row-select-${task.id}`}
          className={`h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-400 transition-opacity ${
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
          }`}
        />
      </Td>

      {/*
       * Title — indented by hierarchy level (0/1/2).
       * Phase 10 (2026-04-08) — Title editing moved entirely to the
       * task detail panel. Clicking the title button now opens the
       * panel via `onViewDetails` (the same handler the row ⋮ menu's
       * "View details" item uses). This matches the operator's stated
       * ClickUp-pattern direction. The InlineText editor is removed.
       * Title is in `READ_ONLY_COLUMNS` so Tab traversal still focuses
       * the cell but never enters an editor; pressing Enter on a
       * focused title row also opens the panel via the row's keydown
       * handler.
       */}
      <Td focused={focused} testId={`cell-title-${task.id}`} onClick={() => onFocusCell('title')}>
        <div className="flex w-full min-w-0 items-center gap-1">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-slate-800 hover:text-blue-700"
            style={{ paddingLeft: `${level * 18}px` }}
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            data-row-level={level}
            data-testid={`title-open-panel-${task.id}`}
            title="Open task details"
          >
            {level > 0 && (
              <span className="text-slate-300" aria-hidden>
                {level === 1 ? '└' : '└─'}
              </span>
            )}
            {task.isMilestone && <Diamond className="h-3 w-3 shrink-0 text-amber-500" />}
            <span className="truncate">{task.title}</span>
          </button>
          {level < 2 && (
            <button
              type="button"
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-blue-600 hover:bg-blue-50 hover:border-blue-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
              data-testid={`title-add-subtask-pill-${task.id}`}
              aria-label={`Add sub-task under ${task.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onAddSubtask();
              }}
            >
              <Plus size={10} className="shrink-0" aria-hidden />
              Sub-task
            </button>
          )}
        </div>
      </Td>

      {/* Assignee — Phase 3 (renamed from Owner). Same data, same editor. */}
      {!hiddenColumns.has('assignee') && (
      <Td focused={focused} testId={`cell-assignee-${task.id}`} onClick={() => onFocusCell('assignee')}>
        {editing === 'assignee' ? (
          <InlineSelect
            value={task.assigneeUserId ?? ''}
            options={[
              { value: '', label: 'Unassigned' },
              ...members.map((m: any) => {
                const u = m.user ?? {};
                const id = m.userId ?? u.id ?? m.id;
                const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
                return {
                  value: id,
                  label: full || u.name || m.name || u.email || m.email || 'Member',
                };
              }),
            ]}
            onCancel={onCancelEdit}
            onCommit={(v) => void onCommit('assignee', v)}
            onTab={(d) => onMoveEditing(d)}
          />
        ) : (
          <button
            type="button"
            className="text-left text-slate-700"
            onClick={() => onStartEdit('assignee')}
          >
            {memberLabel(task.assigneeUserId)}
          </button>
        )}
      </Td>
      )}

      {/* Status */}
      {!hiddenColumns.has('status') && (
      <Td focused={focused} testId={`cell-status-${task.id}`} onClick={() => onFocusCell('status')}>
        {editing === 'status' ? (
          <StatusInlineDropdown
            value={task.status}
            groups={statusGroups}
            onCancel={onCancelEdit}
            onPick={(v) => void onCommit('status', v)}
          />
        ) : (
          <button
            type="button"
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusOpt.swatch} ${statusOpt.text}`}
            onClick={() => onStartEdit('status')}
            data-testid={`status-pill-${task.id}`}
          >
            {statusOpt.label}
          </button>
        )}
      </Td>
      )}

      {/* Start date */}
      {!hiddenColumns.has('startDate') && (
      <Td focused={focused}>
        {editing === 'startDate' ? (
          <InlineDate
            value={task.startDate ?? ''}
            onCancel={onCancelEdit}
            onCommit={(v) => void onCommit('startDate', v)}
            onTab={(d) => onMoveEditing(d)}
          />
        ) : (
          <button
            type="button"
            className="text-left text-slate-700"
            onClick={() => onStartEdit('startDate')}
          >
            {task.startDate ? task.startDate.slice(0, 10) : '—'}
          </button>
        )}
      </Td>
      )}

      {/* Due date */}
      {!hiddenColumns.has('dueDate') && (
      <Td focused={focused}>
        {editing === 'dueDate' ? (
          <InlineDate
            value={task.dueDate ?? ''}
            onCancel={onCancelEdit}
            onCommit={(v) => void onCommit('dueDate', v)}
            onTab={(d) => onMoveEditing(d)}
          />
        ) : (
          <button
            type="button"
            className="text-left text-slate-700"
            onClick={() => onStartEdit('dueDate')}
          >
            {task.dueDate ? task.dueDate.slice(0, 10) : '—'}
          </button>
        )}
      </Td>
      )}

      {/*
       * Completion — Phase 3 read-only computed column.
       * Per-task today: closed bucket → 100%, otherwise 0%. When phase
       * rows become derived task rows (Phase 4+), the same function call
       * with the phase's children's statuses produces the rollup.
       *
       * Visual: small horizontal progress bar matching the operator's
       * mockup aesthetic, plus a numeric label. Empty children → 0% bar.
       */}
      {!hiddenColumns.has('completion') && (
      <Td focused={focused} testId={`cell-completion-${task.id}`}>
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 max-w-[80px] rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                completionPercent === 100 ? 'bg-emerald-500' : 'bg-emerald-400'
              }`}
              style={{ width: `${completionPercent}%` }}
              aria-hidden
            />
          </div>
          <span className="text-[11px] tabular-nums text-slate-600">
            {completionPercent}%
          </span>
        </div>
      </Td>
      )}

      {/*
       * Duration (Days) — Phase 3 read-only computed column.
       * Inclusive day count from start_date to due_date. Returns 0 when
       * either date is missing or invalid; rendered as "—" in that case
       * to match the other date columns' empty state.
       */}
      {!hiddenColumns.has('duration') && (
      <Td focused={focused} testId={`cell-duration-${task.id}`}>
        <span className="tabular-nums text-slate-700">
          {durationDays > 0 ? durationDays : <span className="text-slate-300">—</span>}
        </span>
      </Td>
      )}

      {/* Remarks */}
      {!hiddenColumns.has('remarks') && (
      <Td focused={focused}>
        {editing === 'remarks' ? (
          <InlineText
            initial={task.remarks ?? ''}
            onCancel={onCancelEdit}
            onCommit={(v) => void onCommit('remarks', v)}
            onTab={(d) => onMoveEditing(d)}
            multiline
          />
        ) : (
          <button
            type="button"
            className="block w-full truncate text-left text-slate-600"
            onClick={() => onStartEdit('remarks')}
          >
            {task.remarks ? task.remarks : <span className="text-slate-300">Add remarks</span>}
          </button>
        )}
      </Td>
      )}

      {/*
       * Phase 6 — Row ⋮ actions menu.
       * Hover-revealed by the same `group-hover` mechanism as the
       * leftmost checkbox cell. Click the ⋮ button → opens a small
       * dropdown anchored to the button. Outside-click closes via the
       * effect at the top of the row component. The menu items are
       * intentionally minimal for MVP: detail, sub-task add (depth-limited),
       * duplicate, copy link, delete. "Move", "Convert to milestone",
       * "Archive" arrive with the task detail panel in Phase 7+ when needed.
       *
       * The menu container is `relative` so the absolute-positioned
       * dropdown anchors to the row gutter. `z-20` keeps it above the
       * sticky bulk action bar (z-default).
       */}
      <Td focused={focused}>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label={`Row actions for ${task.title}`}
            aria-expanded={menuOpen}
            data-testid={`row-menu-button-${task.id}`}
            className={`inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-opacity ${
              menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
            }`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              data-testid={`row-menu-${task.id}`}
              className="absolute right-0 top-full mt-1 z-20 w-44 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onViewDetails();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                data-testid={`row-menu-view-${task.id}`}
              >
                <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                Detail
              </button>
              {/*
               * Phase 12 — Add sub-task via row ⋮ menu (hidden when level is 2).
               * Reveals an inline input row directly under this row,
               * indented one level deeper. Type a title + Enter creates
               * the subtask in the same phase via createTask with
               * parentTaskId. Same UX pattern as the existing
               * phase-bottom Add task input — operator's stated direction.
               */}
              {level < 2 && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onAddSubtask();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  data-testid={`row-menu-add-subtask-${task.id}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add sub-task
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDuplicate();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                data-testid={`row-menu-duplicate-${task.id}`}
              >
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  void onCopyTaskLink();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                data-testid={`row-menu-copy-link-${task.id}`}
              >
                <Link className="h-3.5 w-3.5" />
                Copy link
              </button>
              <div className="h-px bg-slate-100 my-1" />
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-700 hover:bg-red-50"
                data-testid={`row-menu-delete-${task.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </Td>
    </tr>
  );
};

/* ──────────────────────────────────────────────────────────────────
 * Inline editors
 * ────────────────────────────────────────────────────────────────── */
const InlineText: React.FC<{
  initial: string;
  onCancel: () => void;
  onCommit: (value: string) => void;
  onTab?: (direction: 1 | -1) => void;
  multiline?: boolean;
}> = ({ initial, onCancel, onCommit, onTab, multiline }) => {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onCommit(value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Tab' && onTab) {
      e.preventDefault();
      onCommit(value);
      onTab(e.shiftKey ? -1 : 1);
    }
  };

  if (multiline) {
    return (
      <textarea
        ref={ref as any}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => onCommit(value)}
        rows={2}
        className="w-full rounded-md border border-blue-300 bg-white px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    );
  }
  return (
    <input
      ref={ref as any}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKey}
      onBlur={() => onCommit(value)}
      className="w-full rounded-md border border-blue-300 bg-white px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
  );
};

const InlineSelect: React.FC<{
  value: string;
  options: Array<{ value: string; label: string }>;
  onCancel: () => void;
  onCommit: (value: string) => void;
  onTab?: (direction: 1 | -1) => void;
}> = ({ value, options, onCancel, onCommit, onTab }) => {
  const ref = useRef<HTMLSelectElement | null>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <select
      ref={ref}
      value={value}
      onChange={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        } else if (e.key === 'Tab' && onTab) {
          e.preventDefault();
          onTab(e.shiftKey ? -1 : 1);
        }
      }}
      onBlur={onCancel}
      className="w-full rounded-md border border-blue-300 bg-white px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
};

const InlineDate: React.FC<{
  value: string;
  onCancel: () => void;
  onCommit: (value: string) => void;
  onTab?: (direction: 1 | -1) => void;
}> = ({ value, onCancel, onCommit, onTab }) => {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <input
      ref={ref}
      type="date"
      defaultValue={value ? value.slice(0, 10) : ''}
      onChange={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        } else if (e.key === 'Tab' && onTab) {
          e.preventDefault();
          onTab(e.shiftKey ? -1 : 1);
        }
      }}
      className="w-full rounded-md border border-blue-300 bg-white px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
  );
};

/* ──────────────────────────────────────────────────────────────────
 * Status inline dropdown — grouped, click to commit, Esc to cancel.
 * ────────────────────────────────────────────────────────────────── */
const StatusInlineDropdown: React.FC<{
  value: WorkTaskStatus;
  groups: WaterfallStatusGroup[];
  onCancel: () => void;
  onPick: (value: WorkTaskStatus) => void;
}> = ({ value, groups, onCancel, onPick }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onCancel]);

  return (
    <div
      ref={ref}
      className="absolute z-10 mt-1 w-48 rounded-md border border-slate-200 bg-white shadow-lg"
      data-testid="waterfall-status-dropdown"
    >
      {groups.map((g) => (
        <div key={g.groupLabel} className="border-b border-slate-100 last:border-b-0">
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {g.groupLabel}
          </div>
          {g.options.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(o.value);
              }}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
            >
              <span className="inline-flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${o.swatch}`} />
                {o.label}
              </span>
              {o.value === value && <Check className="h-3 w-3 text-blue-500" />}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
 * Dependency side panel — real CRUD against existing endpoints.
 * No SVG lines, no fake state.
 * ────────────────────────────────────────────────────────────────── */
const DependencyPanel: React.FC<{
  taskId: string;
  allTasks: WorkTask[];
  onClose: () => void;
}> = ({ taskId, allTasks, onClose }) => {
  const [deps, setDeps] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listDependencies(taskId);
      // Show predecessors only — those are what "blocks this row".
      setDeps(result.predecessors);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load dependencies');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleAdd = async () => {
    if (!picker) return;
    try {
      await addDependency(taskId, picker, 'FINISH_TO_START');
      setPicker('');
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to add dependency');
    }
  };

  const handleRemove = async (predecessorTaskId: string) => {
    try {
      await removeDependency(taskId, predecessorTaskId, 'FINISH_TO_START');
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to remove dependency');
    }
  };

  const candidates = allTasks.filter((t) => t.id !== taskId && !t.deletedAt);

  return (
    <div className="fixed inset-0 z-[6000] flex justify-end" data-testid="waterfall-dependency-panel">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative h-full w-96 overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800">Dependencies</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </header>

        <div className="space-y-3 px-4 py-3">
          {loading && <p className="text-xs text-slate-500">Loading…</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}

          {!loading && deps.length === 0 && (
            <p className="text-xs text-slate-500">No dependencies yet.</p>
          )}

          <ul className="space-y-1">
            {deps.map((d) => (
              <li
                key={d.id || d.predecessorTaskId}
                className="flex items-center justify-between rounded-md border border-slate-100 px-2 py-1.5 text-xs"
              >
                <span className="truncate text-slate-700">
                  {d.predecessorTitle || d.predecessorTaskId}
                </span>
                <button
                  type="button"
                  onClick={() => void handleRemove(d.predecessorTaskId)}
                  className="text-slate-400 hover:text-red-500"
                  aria-label="Remove dependency"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-slate-100 pt-3">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Add predecessor
            </label>
            <select
              value={picker}
              onChange={(e) => setPicker(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
            >
              <option value="">Select a task…</option>
              {candidates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={!picker}
              className="mt-2 w-full rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add dependency
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default WaterfallTable;
