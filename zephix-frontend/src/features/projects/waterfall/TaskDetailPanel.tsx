/**
 * TaskDetailPanel — Phase 7 (2026-04-08)
 *
 * Right-side slide-in panel that opens when the user picks "View details"
 * from a row's ⋮ menu. The panel is the canonical edit surface for
 * properties that don't fit cleanly in a row cell (description, comments,
 * priority, milestone toggle, subtask list) and the place where richer
 * task editing will land in future phases.
 *
 * Architectural shift this panel anchors:
 *   The operator's reference (ClickUp Waterfall) does NOT inline-edit in
 *   the table — every cell click opens the detail panel. Zephix MVP keeps
 *   inline editing in the row body for now (Phase 3 surface), but the
 *   panel ships in parallel as a second editing surface so future phases
 *   can flip the row click → panel-open and remove the inline editors
 *   without losing the editing capability. This phase introduces the
 *   panel via the ⋮ menu so existing inline editing is undisturbed.
 *
 * MVP scope (intentionally narrow):
 *   - Title (editable on blur or Enter)
 *   - Status pill picker (uses the same status set the row uses)
 *   - Assignee dropdown (workspace members)
 *   - Start date / Due date inputs
 *   - Priority dropdown
 *   - Milestone toggle (writes `isMilestone` boolean — task type as
 *     enum migration is post-MVP)
 *   - Description textarea
 *   - Remarks textarea (matches the row column)
 *   - Subtasks list (read-only; click a child opens that child's panel)
 *   - Dependencies list (read-only)
 *   - Comments: list + simple add composer
 *   - Created / Updated timestamps (read-only)
 *
 * Out of scope (deferred):
 *   - Add subtask creation (needs `parentTaskId` in CreateTaskInput —
 *     post-MVP, deferred to the next phase that touches the create API)
 *   - Type dropdown (Task ↔ Milestone ↔ Form Response ↔ etc.) — needs
 *     backend `TaskType` enum migration to use `PHASE`/etc.
 *   - Time tracking, AI assist, attachments, mentions, screen recording,
 *     voice messages, sharing & permissions
 *   - Add subtask, Convert to milestone, Move to phase, Archive in
 *     row-⋮ menu (those land alongside this panel in subsequent phases)
 *
 * Close behavior:
 *   - X button in header
 *   - Escape key
 *   - Click on backdrop overlay
 *
 * Field-level updates use the same `patchTask` callback the row body
 * uses, so optimistic updates and error reload behavior are inherited
 * from WaterfallTable. The panel does not maintain its own task copy —
 * it reads the latest version from the parent's tasks state via the
 * `task` prop, so changes from anywhere (row inline edit, bulk action,
 * other concurrent surface) flow through naturally.
 */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Calendar,
  Diamond,
  Loader2,
  MessageSquare,
  User as UserIcon,
  X,
} from 'lucide-react';
import {
  addComment,
  listComments,
  type TaskComment,
  type WorkTask,
  type WorkTaskPriority,
  type WorkTaskStatus,
} from '@/features/work-management/workTasks.api';
import type { WorkspaceMember } from '@/features/workspaces/workspace.api';
import { AssigneePicker } from '../components/AssigneePicker';

interface WaterfallStatusOption {
  value: WorkTaskStatus;
  label: string;
  swatch: string;
  text: string;
}
interface WaterfallStatusGroup {
  groupLabel: string;
  options: WaterfallStatusOption[];
}

const PRIORITY_OPTIONS: Array<{ value: WorkTaskPriority; label: string }> = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

/**
 * Phase 9 (2026-04-08) — Minimal phase shape consumed by the panel for the
 * Move-to-phase dropdown. Mirrors the relevant subset of the parent's
 * `WaterfallPhase` interface (id + name) so the panel doesn't need a
 * cyclic import on WaterfallTable.
 */
interface PanelPhase {
  id: string;
  name: string;
}

interface TaskDetailPanelProps {
  /** The task being viewed/edited. Read from parent's tasks state. */
  task: WorkTask;
  /** Parent phase name for the breadcrumb. Empty string if unknown. */
  phaseName: string;
  /**
   * Phase 9 — Full phase list for the project, used to populate the
   * Move-to-phase dropdown. The dropdown filters out the current phase
   * from the options at render time.
   */
  phases: PanelPhase[];
  /** Workspace members for the assignee dropdown. */
  members: WorkspaceMember[];
  /** Status set (groups) shared with the row body's picker. */
  statusGroups: WaterfallStatusGroup[];
  /** Direct subtasks of this task — read-only listing. */
  subtasks: WorkTask[];
  /**
   * Patch a task field. Delegates to the parent's `patchTask` so
   * optimistic updates and error reload behavior are inherited.
   */
  onPatch: (
    taskId: string,
    patch: Partial<{
      title: string;
      status: WorkTaskStatus;
      priority: WorkTaskPriority;
      assigneeUserId: string | null;
      startDate: string | null;
      dueDate: string | null;
      description: string | null;
      remarks: string | null;
      isMilestone: boolean;
      phaseId: string;
    }>,
  ) => Promise<void> | void;
  /** Open another task's panel (e.g. when clicking a subtask). */
  onOpenTask: (taskId: string) => void;
  /**
   * Phase 8 (2026-04-08) — Add subtask handler. Returns the created task
   * on success or `null` on failure (so the panel can clear the input
   * draft only on success). The parent `WaterfallTable` already knows
   * which task is being viewed; the handler closure binds the parent
   * task id at injection time so the panel only needs to pass the title.
   */
  onAddSubtask: (title: string) => Promise<WorkTask | null>;
  /** Close handler — invoked by X button, Escape key, and backdrop click. */
  onClose: () => void;
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  task,
  phaseName,
  phases,
  members,
  statusGroups,
  subtasks,
  onPatch,
  onOpenTask,
  onAddSubtask,
  onClose,
}) => {
  // Local draft for the title input (committed on blur or Enter to avoid
  // round-tripping every keystroke). All other fields commit immediately
  // because they're discrete picks (status, assignee, dates, priority).
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [descriptionDraft, setDescriptionDraft] = useState<string>(
    task.description ?? '',
  );
  const [remarksDraft, setRemarksDraft] = useState<string>(task.remarks ?? '');

  // Re-sync local drafts when the underlying task changes (e.g. another
  // surface patched it, or the panel opens for a different task).
  useEffect(() => {
    setTitleDraft(task.title);
    setDescriptionDraft(task.description ?? '');
    setRemarksDraft(task.remarks ?? '');
  }, [task.id, task.title, task.description, task.remarks]);

  // Comments — load when the task changes; refresh after a successful add.
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  // Phase 8 — Add subtask draft + submission state.
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [subtaskSubmitting, setSubtaskSubmitting] = useState(false);

  const handleSubmitSubtask = useCallback(async () => {
    const title = subtaskDraft.trim();
    if (!title || subtaskSubmitting) return;
    setSubtaskSubmitting(true);
    try {
      const created = await onAddSubtask(title);
      // Only clear the draft on success — failure leaves the typed text
      // in place so the user can retry without re-typing.
      if (created) {
        setSubtaskDraft('');
      }
    } finally {
      setSubtaskSubmitting(false);
    }
  }, [subtaskDraft, subtaskSubmitting, onAddSubtask]);

  // Reset subtask draft when the panel switches to a different task —
  // a draft typed under one parent should not silently carry over to
  // another parent.
  useEffect(() => {
    setSubtaskDraft('');
  }, [task.id]);

  const loadComments = useCallback(async (taskId: string) => {
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const res = await listComments(taskId);
      setComments(res.items);
    } catch (err: any) {
      setCommentsError(
        err?.response?.data?.message ||
          err?.message ||
          'Could not load comments',
      );
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadComments(task.id);
  }, [task.id, loadComments]);

  const handleSubmitComment = useCallback(async () => {
    const body = commentDraft.trim();
    if (!body || commentSubmitting) return;
    setCommentSubmitting(true);
    setCommentsError(null);
    try {
      const created = await addComment(task.id, body);
      setComments((prev) => [...prev, created]);
      setCommentDraft('');
    } catch (err: any) {
      setCommentsError(
        err?.response?.data?.message ||
          err?.message ||
          'Could not add comment',
      );
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentDraft, commentSubmitting, task.id]);

  // Escape key closes the panel. Listener is registered while the panel
  // is mounted so multiple stacked surfaces don't fight over the key.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

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

  const commitTitle = () => {
    const next = titleDraft.trim();
    if (!next || next === task.title) {
      setTitleDraft(task.title);
      return;
    }
    void onPatch(task.id, { title: next });
  };

  const commitDescription = () => {
    const next = descriptionDraft;
    if ((next ?? '') === (task.description ?? '')) return;
    void onPatch(task.id, { description: next === '' ? null : next });
  };

  const commitRemarks = () => {
    const next = remarksDraft;
    if ((next ?? '') === (task.remarks ?? '')) return;
    void onPatch(task.id, { remarks: next === '' ? null : next });
  };

  const formatDate = (iso: string | null): string => {
    if (!iso) return '';
    return iso.slice(0, 10);
  };

  const formatTimestamp = (iso: string | null | undefined): string => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <>
      {/* Backdrop — semi-transparent overlay closes the panel on click. */}
      <div
        className="fixed inset-0 z-30 bg-slate-900/20"
        onClick={onClose}
        aria-hidden
        data-testid="task-detail-panel-backdrop"
      />
      {/* Panel itself — slides in from the right edge. */}
      <aside
        className="fixed top-0 right-0 z-40 h-full w-full max-w-[520px] overflow-y-auto border-l border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-label={`Task details: ${task.title}`}
        data-testid="task-detail-panel"
      >
        {/* Header strip */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 text-xs text-slate-500 truncate">
              {phaseName ? (
                <>
                  <span className="text-slate-400">{phaseName}</span>
                  <span className="text-slate-300 mx-1.5">/</span>
                </>
              ) : null}
              <span className="text-slate-600">Task</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close task details"
              data-testid="task-detail-panel-close"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Title */}
          <div>
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              className="w-full text-xl font-semibold text-slate-900 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-blue-300 focus:outline-none px-0 py-1"
              placeholder="Task title"
              data-testid="task-detail-title-input"
            />
            {task.isMilestone && (
              <div className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700">
                <Diamond className="h-3 w-3" />
                Milestone task
              </div>
            )}
          </div>

          {/* Properties grid */}
          <dl className="divide-y divide-slate-100 border-y border-slate-100">
            {/* Status */}
            <div className="flex items-center gap-3 py-2.5">
              <dt className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </dt>
              <dd className="min-w-0 flex-1">
                <select
                  value={task.status}
                  onChange={(e) =>
                    void onPatch(task.id, { status: e.target.value as WorkTaskStatus })
                  }
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  data-testid="task-detail-status"
                >
                  {statusGroups.flatMap((group) =>
                    group.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    )),
                  )}
                </select>
              </dd>
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-3 py-2.5">
              <dt className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500 inline-flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                Assignee
              </dt>
              <dd className="relative min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setAssigneePickerOpen((v) => !v)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 max-w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  data-testid="task-detail-assignee"
                >
                  {task.assigneeUserId
                    ? (() => {
                        const m = members.find(
                          (m: any) => (m.userId ?? m.user?.id ?? m.id) === task.assigneeUserId,
                        );
                        if (!m) return 'Assigned';
                        const u = (m as any).user ?? {};
                        return [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || 'Assigned';
                      })()
                    : 'Unassigned'}
                </button>
                {assigneePickerOpen && (
                  <AssigneePicker
                    value={task.assigneeUserId}
                    options={members.map((m: any) => {
                      const u = m.user ?? {};
                      const id = m.userId ?? u.id ?? m.id;
                      const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
                      return {
                        id,
                        name: full || u.name || m.name || u.email || m.email || 'Member',
                        email: u.email || m.email,
                      };
                    })}
                    onSelect={(userId) => {
                      void onPatch(task.id, { assigneeUserId: userId });
                    }}
                    onClose={() => setAssigneePickerOpen(false)}
                    className="top-full left-0 mt-1"
                  />
                )}
              </dd>
            </div>

            {/* Start date */}
            <div className="flex items-center gap-3 py-2.5">
              <dt className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500 inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Start date
              </dt>
              <dd className="min-w-0 flex-1">
                <input
                  type="date"
                  value={formatDate(task.startDate)}
                  onChange={(e) =>
                    void onPatch(task.id, { startDate: e.target.value || null })
                  }
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  data-testid="task-detail-start-date"
                />
              </dd>
            </div>

            {/* Due date */}
            <div className="flex items-center gap-3 py-2.5">
              <dt className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500 inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due date
              </dt>
              <dd className="min-w-0 flex-1">
                <input
                  type="date"
                  value={formatDate(task.dueDate)}
                  onChange={(e) =>
                    void onPatch(task.id, { dueDate: e.target.value || null })
                  }
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  data-testid="task-detail-due-date"
                />
              </dd>
            </div>

            {/* Priority */}
            <div className="flex items-center gap-3 py-2.5">
              <dt className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
                Priority
              </dt>
              <dd className="min-w-0 flex-1">
                <select
                  value={task.priority}
                  onChange={(e) =>
                    void onPatch(task.id, {
                      priority: e.target.value as WorkTaskPriority,
                    })
                  }
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  data-testid="task-detail-priority"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </dd>
            </div>

            {/* Milestone toggle */}
            <div className="flex items-center gap-3 py-2.5">
              <dt className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
                Milestone
              </dt>
              <dd className="min-w-0 flex-1">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={task.isMilestone}
                    onChange={(e) =>
                      void onPatch(task.id, { isMilestone: e.target.checked })
                    }
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                    data-testid="task-detail-milestone"
                  />
                  <Diamond className="h-3.5 w-3.5 text-amber-500" />
                  Mark as milestone
                </label>
              </dd>
            </div>

            {/*
             * Phase 9 — Move-to-phase dropdown.
             * Shows the current phase plus every other phase in the
             * project. Picking a different phase fires onPatch with the
             * new phaseId; the parent's patchTask handles the optimistic
             * update + backend call. The new phase appears in the row's
             * grouping immediately because the row is grouped by phaseId
             * in WaterfallTable's render.
             *
             * Subtasks are NOT auto-reparented (they keep their parent
             * task id and inherit the new phase via parent traversal).
             * Backend service validates the target phase belongs to the
             * same project and is not deleted.
             */}
            {phases.length > 1 && (
              <div className="flex items-center gap-3 py-2.5">
                <dt className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Phase
                </dt>
                <dd className="min-w-0 flex-1">
                  <select
                    value={task.phaseId ?? ''}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (!next || next === task.phaseId) return;
                      void onPatch(task.id, { phaseId: next });
                    }}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 max-w-full"
                    data-testid="task-detail-phase"
                    aria-label="Move task to a different phase"
                  >
                    {phases.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
            )}
          </dl>

          {/* Description */}
          <div>
            <label
              className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5"
              htmlFor="task-detail-description"
            >
              Description
            </label>
            <textarea
              id="task-detail-description"
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              onBlur={commitDescription}
              rows={4}
              placeholder="Add a description…"
              className="w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              data-testid="task-detail-description-input"
            />
          </div>

          {/* Remarks */}
          <div>
            <label
              className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5"
              htmlFor="task-detail-remarks"
            >
              Remarks
            </label>
            <textarea
              id="task-detail-remarks"
              value={remarksDraft}
              onChange={(e) => setRemarksDraft(e.target.value)}
              onBlur={commitRemarks}
              rows={2}
              placeholder="Add remarks…"
              className="w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              data-testid="task-detail-remarks-input"
            />
          </div>

          {/* Subtasks (Phase 7 list + Phase 8 add) */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
              Subtasks{' '}
              <span className="font-normal text-slate-400">
                ({subtasks.length})
              </span>
            </h3>
            {subtasks.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No subtasks yet.</p>
            ) : (
              <ul
                className="space-y-1 mb-2"
                data-testid="task-detail-subtasks"
              >
                {subtasks.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onOpenTask(s.id)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span className="text-slate-300">└</span>
                      <span className="truncate flex-1">{s.title}</span>
                      <span className="text-[10px] uppercase text-slate-400">
                        {s.status.toLowerCase().replace('_', ' ')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/*
             * Phase 8 — Add subtask inline composer.
             * Type a title, press Enter (or click Add) → creates a child
             * of the current task in the same phase. Failure leaves the
             * draft in place so the user can retry. Disabled while a
             * submission is in flight.
             */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={subtaskDraft}
                onChange={(e) => setSubtaskDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleSubmitSubtask();
                  }
                }}
                disabled={subtaskSubmitting}
                placeholder="Add a subtask…"
                className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
                data-testid="task-detail-subtask-input"
                aria-label="Add a subtask"
              />
              <button
                type="button"
                onClick={() => void handleSubmitSubtask()}
                disabled={!subtaskDraft.trim() || subtaskSubmitting}
                className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="task-detail-subtask-add"
              >
                {subtaskSubmitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Add'
                )}
              </button>
            </div>
          </div>

          {/* Comments */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2 inline-flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" />
              Comments{' '}
              <span className="font-normal text-slate-400">
                ({comments.length})
              </span>
            </h3>
            {commentsError && (
              <p
                className="mb-2 text-xs text-red-700"
                data-testid="task-detail-comments-error"
              >
                {commentsError}
              </p>
            )}
            {commentsLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading comments…
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No comments yet.</p>
            ) : (
              <ul
                className="space-y-2"
                data-testid="task-detail-comments-list"
              >
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="text-[11px] text-slate-500 mb-0.5">
                      {memberLabel(c.authorUserId)} ·{' '}
                      {formatTimestamp(c.createdAt)}
                    </div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">
                      {c.body}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Composer */}
            <div className="mt-3 flex items-end gap-2">
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void handleSubmitComment();
                  }
                }}
                rows={2}
                placeholder="Write a comment… (Cmd/Ctrl+Enter to send)"
                className="flex-1 resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                data-testid="task-detail-comment-input"
              />
              <button
                type="button"
                onClick={() => void handleSubmitComment()}
                disabled={!commentDraft.trim() || commentSubmitting}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="task-detail-comment-submit"
              >
                {commentSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Send'
                )}
              </button>
            </div>
          </div>

          {/* Footer metadata */}
          <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-400 space-y-0.5">
            <div>Created: {formatTimestamp(task.createdAt)}</div>
            <div>Updated: {formatTimestamp(task.updatedAt)}</div>
          </div>
        </div>
      </aside>
    </>
  );
};
