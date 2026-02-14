/**
 * ProjectTableTab — Step 28 B1-B4 Upgrade
 *
 * Spreadsheet-like grid with:
 * - Bulk selection (checkbox, select-all, shift-click range)
 * - Bulk actions bar (status, assign, phase, delete)
 * - Inline editing for all key fields (B2)
 * - Column visibility + order persistence (B3)
 * - Grouping support (B4)
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Table2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  AlertCircle,
  Plus,
  X,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask as deleteTaskApi,
  type WorkTask,
  type WorkTaskStatus,
  type WorkTaskPriority,
} from '@/features/work-management/workTasks.api';
import { toast } from 'sonner';
import { WorkItemDetailPanel } from '@/features/work-management/components/WorkItemDetailPanel';
import { ViewToolbar } from '../views/ViewToolbar';
import { calculateScheduleInfo, SCHEDULE_STATUS_CONFIG } from '@/features/work-management/utils/schedule-variance';
import { InlineLoadingState } from '@/components/ui/states';
import { listWorkspaceMembers, type WorkspaceMemberRow } from '@/features/workspaces/members/api';
import { apiClient } from '@/lib/api/client';
import { FilterBar, filtersFromParams, filtersToApiParams, isFilterActive, type FilterBarOptions, type TaskFilters } from '../components/FilterBar';
import { useWorkspacePermissions } from '@/hooks/useWorkspacePermissions';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type SortField = 'title' | 'status' | 'priority' | 'dueDate' | 'type' | 'createdAt';
type SortDir = 'asc' | 'desc';

const STATUS_OPTIONS: WorkTaskStatus[] = [
  'BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'DONE', 'CANCELED',
];
const PRIORITY_OPTIONS: WorkTaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const TYPE_OPTIONS = ['TASK', 'EPIC', 'MILESTONE', 'BUG'];

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: 'bg-slate-100 text-slate-700',
  TODO: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  BLOCKED: 'bg-red-100 text-red-700',
  IN_REVIEW: 'bg-purple-100 text-purple-700',
  DONE: 'bg-green-100 text-green-700',
  CANCELED: 'bg-slate-200 text-slate-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

/* ------------------------------------------------------------------ */
/*  Column config (B3)                                                 */
/* ------------------------------------------------------------------ */

interface ColumnDef {
  id: string;
  label: string;
  sortField?: SortField;
  width: string;
  visible: boolean;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'title', label: 'Title', sortField: 'title', width: 'min-w-[260px]', visible: true },
  { id: 'status', label: 'Status', sortField: 'status', width: 'w-32', visible: true },
  { id: 'priority', label: 'Priority', sortField: 'priority', width: 'w-28', visible: true },
  { id: 'dueDate', label: 'Due Date', sortField: 'dueDate', width: 'w-32', visible: true },
  { id: 'startDate', label: 'Start Date', width: 'w-32', visible: false },
  { id: 'type', label: 'Type', sortField: 'type', width: 'w-24', visible: true },
  { id: 'assignee', label: 'Assignee', width: 'w-32', visible: true },
  { id: 'phase', label: 'Phase', width: 'w-32', visible: true },
  { id: 'tags', label: 'Tags', width: 'w-36', visible: false },
  { id: 'estimatedEffortHours', label: 'Est. Hours', width: 'w-24', visible: false },
  { id: 'remainingEffortHours', label: 'Rem. Hours', width: 'w-24', visible: false },
  { id: 'schedule', label: 'Schedule', width: 'w-20', visible: true },
];

/* ------------------------------------------------------------------ */
/*  Toolbar config                                                     */
/* ------------------------------------------------------------------ */

interface TableToolbarConfig {
  search?: string;
  groupBy?: string | null;
  sortBy?: string | null;
  sortDir?: 'asc' | 'desc';
  visibleFields?: string[];
  showClosed?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const ProjectTableTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [searchParams] = useSearchParams();
  const { canEditWork } = useWorkspacePermissions();

  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Toolbar config
  const [toolbarConfig, setToolbarConfig] = useState<TableToolbarConfig>({
    showClosed: false,
  });

  // Inline create
  const [showAddRow, setShowAddRow] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // Bulk selection (B1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedRef = useRef<string | null>(null);

  // Bulk action state
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkValue, setBulkValue] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Inline editing (B2) + Sprint 1 unified onCommit pipeline
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [commitError, setCommitError] = useState<{ taskId: string; field: string; message: string } | null>(null);

  // Column visibility (B3) — server-backed with localStorage fallback
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [tableViewId, setTableViewId] = useState<string | null>(null);
  const viewConfigLoadedRef = useRef(false);

  // Grouping (B4)
  const [groups, setGroups] = useState<Array<{ key: string; label: string; count: number; completionPercent: number; items: WorkTask[] }> | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Members + Phases for bulk actions (Fix 2)
  const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
  const [phases, setPhases] = useState<Array<{ id: string; name: string }>>([]);

  // Pagination (Sprint 1)
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 200;

  const visibleColumns = useMemo(() => columns.filter((c) => c.visible), [columns]);

  // Sprint 1: FilterBar options and URL-synced filters
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const filterBarOptions: FilterBarOptions = useMemo(() => ({
    members,
    phases,
    statuses: STATUS_OPTIONS as unknown as string[],
    priorities: PRIORITY_OPTIONS as unknown as string[],
    types: TYPE_OPTIONS,
  }), [members, phases]);

  /* ---- Load view config from server (once) ---- */
  useEffect(() => {
    if (!projectId || !activeWorkspaceId || viewConfigLoadedRef.current) return;
    viewConfigLoadedRef.current = true;

    apiClient
      .get(`/workspaces/${activeWorkspaceId}/projects/${projectId}/views`, {
        headers: { 'x-workspace-id': activeWorkspaceId },
      })
      .then((res) => {
        const views = (res?.data as any)?.data ?? (res?.data as any) ?? [];
        const tableView = views.find(
          (v: any) => v.type === 'table' && (v.ownerId != null || v.ownerId === null),
        );
        if (tableView) {
          setTableViewId(tableView.id);
          const cfg = tableView.config ?? {};
          if (cfg.visibleFields && Array.isArray(cfg.visibleFields)) {
            setColumns((prev) =>
              prev.map((col) => ({
                ...col,
                visible: cfg.visibleFields.includes(col.id),
              })),
            );
          }
        }
      })
      .catch(() => {
        // Fallback: try localStorage
        try {
          const saved = localStorage.getItem(`zephix-table-cols-${projectId}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) setColumns(parsed);
          }
        } catch { /* use defaults */ }
      });
  }, [projectId, activeWorkspaceId]);

  /* ---- Persist column config to server + localStorage ---- */
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!projectId || !activeWorkspaceId) return;

    // Always save to localStorage as cache
    try {
      localStorage.setItem(`zephix-table-cols-${projectId}`, JSON.stringify(columns));
    } catch { /* silent */ }

    // Debounced server save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const visibleFields = columns.filter((c) => c.visible).map((c) => c.id);
      const config = { visibleFields };

      if (tableViewId) {
        // Update existing view
        apiClient
          .patch(
            `/workspaces/${activeWorkspaceId}/projects/${projectId}/views/${tableViewId}`,
            { config },
            { headers: { 'x-workspace-id': activeWorkspaceId } },
          )
          .catch(() => {}); // Silent — localStorage is backup
      } else {
        // Create personal table view
        apiClient
          .post(
            `/workspaces/${activeWorkspaceId}/projects/${projectId}/views?personal=true`,
            { type: 'table', label: 'Table', config },
            { headers: { 'x-workspace-id': activeWorkspaceId } },
          )
          .then((res) => {
            const view = (res?.data as any)?.data ?? (res?.data as any);
            if (view?.id) setTableViewId(view.id);
          })
          .catch(() => {});
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [columns, projectId, activeWorkspaceId, tableViewId]);

  /* ---- Load members + phases for bulk actions ---- */

  useEffect(() => {
    if (!activeWorkspaceId) return;
    listWorkspaceMembers(activeWorkspaceId).then(setMembers).catch(() => {});
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!projectId || !activeWorkspaceId) return;
    apiClient
      .get(`/work/projects/${projectId}/plan`, {
        headers: { 'x-workspace-id': activeWorkspaceId },
      })
      .then((res) => {
        const plan = (res?.data as any)?.data ?? (res?.data as any);
        setPhases((plan?.phases ?? []).map((p: any) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {});
  }, [projectId, activeWorkspaceId]);

  /* ---- Data loading ---- */

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);

      // Sprint 1: Build API params from URL filters
      const apiFilters = filtersToApiParams(filters);
      const baseParams = {
        projectId,
        limit: 200,
        ...apiFilters,
      };

      // Grouping not yet implemented - use regular listTasks
      const result = await listTasks(baseParams);
      setTasks(result.items.filter((t) => !t.deletedAt));
      setTotalCount(result.total);
      setGroups(null);
      // Clear selection when data changes (filters or reload)
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error('Table: failed to load tasks', err);
      setError(err?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [projectId, toolbarConfig.groupBy, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---- Sorting ---- */

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  /* ---- Filter + sort tasks ---- */

  const getFilteredSorted = (taskList: WorkTask[]) => {
    let filtered = taskList.filter((t) => {
      if (!toolbarConfig.showClosed && (t.status === 'DONE' || t.status === 'CANCELED'))
        return false;
      if (
        toolbarConfig.search &&
        !t.title.toLowerCase().includes(toolbarConfig.search.toLowerCase())
      )
        return false;
      // Sprint 1: Client-side filtering for multi-value filters not fully handled by backend
      if (filters.priority && filters.priority.length > 1 && !filters.priority.includes(t.priority))
        return false;
      if (filters.assigneeUserId && filters.assigneeUserId.length > 1 && !filters.assigneeUserId.includes(t.assigneeUserId || ''))
        return false;
      if (filters.phaseId && filters.phaseId.length > 1 && !filters.phaseId.includes(t.phaseId || ''))
        return false;
      if (filters.type && filters.type.length > 1 && !filters.type.includes(t.type || ''))
        return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const av = (a as any)[sortField] ?? '';
      const bv = (b as any)[sortField] ?? '';
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  };

  const sorted = useMemo(() => getFilteredSorted(tasks), [tasks, toolbarConfig, sortField, sortDir]);

  /* ---- Sprint 1: Unified onCommit pipeline ---- */
  /* All inline edits and bulk actions route through this single function.
   * 1. Optimistic update → local state
   * 2. Call updateTask
   * 3. Rollback on failure + show error banner
   */

  const onCommit = useCallback(async (
    taskId: string,
    field: string,
    value: string | string[] | number | null,
  ) => {
    // Client-side validation
    if (field === 'startDate' && value) {
      const task = tasks.find((t) => t.id === taskId);
      if (task?.dueDate && String(value) > task.dueDate.split('T')[0]) {
        setCommitError({ taskId, field, message: 'Start date cannot be after due date' });
        return;
      }
    }
    if (field === 'dueDate' && value) {
      const task = tasks.find((t) => t.id === taskId);
      if (task?.startDate && String(value) < task.startDate.split('T')[0]) {
        setCommitError({ taskId, field, message: 'Due date cannot be before start date' });
        return;
      }
    }
    if ((field === 'estimateHours' || field === 'remainingHours') && value !== null) {
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        setCommitError({ taskId, field, message: 'Effort cannot be negative' });
        return;
      }
    }

    // Optimistic update
    const snapshot = tasks;
    setTasks((ts) =>
      ts.map((t) => (t.id === taskId ? { ...t, [field]: value } : t)),
    );
    setEditingCell(null);
    setCommitError(null);

    try {
      await updateTask(taskId, { [field]: value } as any);
    } catch (err: any) {
      // Rollback
      setTasks(snapshot);
      const msg = err?.response?.data?.message || err?.message || `Failed to update ${field}`;
      setCommitError({ taskId, field, message: msg });
    }
  }, [tasks]);

  const startEdit = (taskId: string, field: string, currentValue: string) => {
    if (!canEditWork) return; // Follow-up C: read-only users cannot enter edit mode
    setEditingCell({ taskId, field });
    setEditValue(currentValue);
    setCommitError(null);
  };

  /* ---- Inline create ---- */

  const handleInlineCreate = async () => {
    if (!projectId || !newTitle.trim() || creating) return;
    setCreating(true);
    try {
      const created = await createTask({ projectId, title: newTitle.trim() });
      setTasks((prev) => [...prev, created]);
      setNewTitle('');
      setShowAddRow(false);
      toast.success('Task created');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  /* ---- Bulk selection (B1) ---- */

  const toggleSelect = (taskId: string, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (shiftKey && lastClickedRef.current) {
        // Range selection
        const lastIdx = sorted.findIndex((t) => t.id === lastClickedRef.current);
        const curIdx = sorted.findIndex((t) => t.id === taskId);
        if (lastIdx >= 0 && curIdx >= 0) {
          const [start, end] = lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
          for (let i = start; i <= end; i++) {
            next.add(sorted[i].id);
          }
        }
      } else {
        if (next.has(taskId)) {
          next.delete(taskId);
        } else {
          next.add(taskId);
        }
      }

      lastClickedRef.current = taskId;
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((t) => t.id)));
    }
  };

  /* ---- Bulk actions (B1) ---- */

  // Follow-up B: structured error code classifier
  const classifyBulkError = (err: any): { code: string; label: string } => {
    const status = err?.response?.status || err?.status;
    if (status === 403) return { code: 'PERMISSION_DENIED', label: 'Permission denied' };
    if (status === 409) return { code: 'CONFLICT', label: 'Conflict' };
    if (status === 400) return { code: 'VALIDATION_FAILED', label: 'Validation failed' };
    return { code: 'SYSTEM_ERROR', label: 'System error' };
  };

  const [bulkError, setBulkError] = useState<{ failedCount: number; code: string; message: string } | null>(null);

  const handleBulkExecute = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkProcessing(true);
    setBulkError(null);
    const ids = Array.from(selectedIds);
    let hadFailures = false;

    try {
      if (bulkAction === 'delete') {
        if (!confirm(`Delete ${ids.length} task${ids.length > 1 ? 's' : ''}?`)) {
          setBulkProcessing(false);
          return;
        }
        const results = await Promise.allSettled(ids.map((id) => deleteTaskApi(id)));
        const successIds = new Set<string>();
        const failedIds: string[] = [];
        let primaryError: { code: string; label: string } | null = null;

        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            successIds.add(ids[i]);
          } else {
            failedIds.push(ids[i]);
            if (!primaryError) primaryError = classifyBulkError(r.reason);
          }
        });
        hadFailures = failedIds.length > 0;

        if (successIds.size > 0) {
          setTasks((prev) => prev.filter((t) => !successIds.has(t.id)));
          toast.success(`Deleted ${successIds.size} task${successIds.size > 1 ? 's' : ''}`);
        }
        if (hadFailures) {
          console.error('Bulk delete failed IDs:', failedIds);
          const errInfo = primaryError || { code: 'SYSTEM_ERROR', label: 'System error' };
          setBulkError({
            failedCount: failedIds.length,
            code: errInfo.code,
            message: `${failedIds.length} task${failedIds.length > 1 ? 's' : ''} failed to delete — ${errInfo.code}: ${errInfo.label}`,
          });
        }
        // Keep failed IDs selected, clear only successful ones
        setSelectedIds((prev) => {
          const next = new Set(prev);
          successIds.forEach((id) => next.delete(id));
          return next;
        });
      } else {
        const patch: Record<string, any> = {};
        if (bulkAction === 'status') patch.status = bulkValue;
        if (bulkAction === 'priority') patch.priority = bulkValue;
        if (bulkAction === 'assignee') patch.assigneeUserId = bulkValue || null;
        if (bulkAction === 'unassign') patch.assigneeUserId = null;
        if (bulkAction === 'phase') patch.phaseId = bulkValue || null;

        const results = await Promise.allSettled(
          ids.map((id) => updateTask(id, patch)),
        );

        const successIds = new Set<string>();
        const failedIds: string[] = [];
        let primaryError: { code: string; label: string } | null = null;

        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            successIds.add(ids[i]);
          } else {
            failedIds.push(ids[i]);
            if (!primaryError) primaryError = classifyBulkError(r.reason);
          }
        });
        hadFailures = failedIds.length > 0;

        if (successIds.size > 0) {
          const fulfilled = results.filter(
            (r): r is PromiseFulfilledResult<WorkTask> => r.status === 'fulfilled',
          );
          const updatedMap = new Map(fulfilled.map((r) => [r.value.id, r.value]));
          setTasks((prev) => prev.map((t) => updatedMap.get(t.id) || t));
          toast.success(`Updated ${successIds.size} task${successIds.size > 1 ? 's' : ''}`);
        }
        if (hadFailures) {
          console.error('Bulk update failed IDs:', failedIds);
          const errInfo = primaryError || { code: 'SYSTEM_ERROR', label: 'System error' };
          setBulkError({
            failedCount: failedIds.length,
            code: errInfo.code,
            message: `${failedIds.length} task${failedIds.length > 1 ? 's' : ''} failed to update — ${errInfo.code}: ${errInfo.label}`,
          });
        }
        // Keep failed IDs selected, clear only successful ones
        setSelectedIds((prev) => {
          const next = new Set(prev);
          successIds.forEach((id) => next.delete(id));
          return next;
        });
      }

      // Only reset bulk action panel if all succeeded
      if (!hadFailures) {
        setBulkAction(null);
        setBulkValue('');
      }
    } catch (err: any) {
      setBulkError({
        failedCount: ids.length,
        code: 'SYSTEM_ERROR',
        message: `Bulk action failed — SYSTEM_ERROR: ${err?.message || 'Unknown error'}`,
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  /* ---- Column visibility (B3) ---- */

  const toggleColumn = (colId: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, visible: !c.visible } : c)),
    );
  };

  /* ---- Grouping (B4) ---- */

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* ---- Starter tasks (A2 / Fix 4: server-side with audit) ---- */

  const [addingStarter, setAddingStarter] = useState(false);

  const handleAddStarterTasks = async () => {
    if (!projectId || !activeWorkspaceId || addingStarter) return;
    setAddingStarter(true);
    try {
      const res = await apiClient.post(
        `/work/tasks/projects/${projectId}/starter-pack`,
        {},
        { headers: { 'x-workspace-id': activeWorkspaceId } },
      );
      const data = (res?.data as any)?.data ?? (res?.data as any);
      toast.success(`Added ${data?.tasksCreated ?? 15} starter tasks`);
      // Reload to get the server-created tasks
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to add starter tasks');
    } finally {
      setAddingStarter(false);
    }
  };

  /* ---- Sort icon helper ---- */

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 text-slate-400" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-indigo-600" />
    ) : (
      <ArrowDown className="h-3 w-3 text-indigo-600" />
    );
  };

  /* ---- Render cell — Sprint 1 complete set ---- */

  const memberNameMap = useMemo(() => {
    const m = new Map<string, string>();
    members.forEach((mb) => m.set(mb.userId, mb.name || mb.email));
    return m;
  }, [members]);

  const phaseNameMap = useMemo(() => {
    const m = new Map<string, string>();
    phases.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [phases]);

  const renderCell = (task: WorkTask, colId: string) => {
    const isEditing = editingCell?.taskId === task.id && editingCell?.field === colId;
    const hasError = commitError?.taskId === task.id && commitError?.field === colId;
    const errorBorder = hasError ? ' ring-1 ring-red-400' : '';

    switch (colId) {
      case 'title':
        if (isEditing) {
          return (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCommit(task.id, 'title', editValue);
                if (e.key === 'Escape') setEditingCell(null);
              }}
              onBlur={() => onCommit(task.id, 'title', editValue)}
              className={`w-full text-sm px-1 py-0.5 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400${errorBorder}`}
              autoFocus
            />
          );
        }
        return (
          <span
            className="text-sm font-medium text-slate-900 truncate block max-w-[400px] cursor-text"
            onDoubleClick={(e) => { e.stopPropagation(); startEdit(task.id, 'title', task.title); }}
          >
            {task.title}
          </span>
        );

      case 'status':
        return (
          <select
            value={task.status}
            onChange={(e) => onCommit(task.id, 'status', e.target.value)}
            disabled={!canEditWork}
            className={`text-xs px-2 py-0.5 rounded font-medium border-0 ${canEditWork ? 'cursor-pointer' : 'cursor-default opacity-80'} ${STATUS_COLORS[task.status] || 'bg-slate-100 text-slate-700'}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        );

      case 'priority':
        return (
          <select
            value={task.priority}
            onChange={(e) => onCommit(task.id, 'priority', e.target.value)}
            disabled={!canEditWork}
            className={`text-xs px-2 py-0.5 rounded font-medium border-0 ${canEditWork ? 'cursor-pointer' : 'cursor-default opacity-80'} ${PRIORITY_COLORS[task.priority] || 'bg-slate-100 text-slate-600'}`}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        );

      case 'dueDate':
        if (isEditing) {
          return (
            <input
              type="date"
              value={editValue}
              onChange={(e) => onCommit(task.id, 'dueDate', e.target.value || null)}
              onBlur={() => setEditingCell(null)}
              className={`text-xs border border-indigo-300 rounded px-1 py-0.5 focus:outline-none${errorBorder}`}
              autoFocus
            />
          );
        }
        return (
          <span
            className="text-sm text-slate-600 cursor-text"
            onDoubleClick={(e) => { e.stopPropagation(); startEdit(task.id, 'dueDate', task.dueDate?.split('T')[0] || ''); }}
          >
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : <span className="text-slate-400">—</span>}
          </span>
        );

      case 'startDate':
        if (isEditing) {
          return (
            <input
              type="date"
              value={editValue}
              onChange={(e) => onCommit(task.id, 'startDate', e.target.value || null)}
              onBlur={() => setEditingCell(null)}
              className={`text-xs border border-indigo-300 rounded px-1 py-0.5 focus:outline-none${errorBorder}`}
              autoFocus
            />
          );
        }
        return (
          <span
            className="text-sm text-slate-600 cursor-text"
            onDoubleClick={(e) => { e.stopPropagation(); startEdit(task.id, 'startDate', task.startDate?.split('T')[0] || ''); }}
          >
            {task.startDate ? new Date(task.startDate).toLocaleDateString() : <span className="text-slate-400">—</span>}
          </span>
        );

      case 'type':
        return (
          <select
            value={task.type || 'TASK'}
            onChange={(e) => onCommit(task.id, 'type', e.target.value)}
            disabled={!canEditWork}
            className={`text-xs px-1 py-0.5 rounded bg-transparent border-0 text-slate-500 uppercase ${canEditWork ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        );

      case 'assignee':
        return (
          <select
            value={task.assigneeUserId || ''}
            onChange={(e) => onCommit(task.id, 'assigneeUserId', e.target.value || null)}
            disabled={!canEditWork}
            className={`text-xs px-1 py-0.5 rounded bg-transparent border-0 text-slate-600 max-w-[120px] truncate ${canEditWork ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>{m.name || m.email}</option>
            ))}
          </select>
        );

      case 'phase':
        return (
          <select
            value={task.phaseId || ''}
            onChange={(e) => onCommit(task.id, 'phaseId', e.target.value || null)}
            disabled={!canEditWork}
            className={`text-xs px-1 py-0.5 rounded bg-transparent border-0 text-slate-600 max-w-[120px] truncate ${canEditWork ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
          >
            <option value="">No phase</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        );

      case 'tags':
        if (isEditing) {
          return (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const tagArr = editValue.split(',').map((t) => t.trim()).filter(Boolean);
                  onCommit(task.id, 'tags', tagArr.length > 0 ? tagArr : null);
                }
                if (e.key === 'Escape') setEditingCell(null);
              }}
              onBlur={() => {
                const tagArr = editValue.split(',').map((t) => t.trim()).filter(Boolean);
                onCommit(task.id, 'tags', tagArr.length > 0 ? tagArr : null);
              }}
              placeholder="tag1, tag2..."
              className={`w-full text-xs px-1 py-0.5 border border-indigo-300 rounded focus:outline-none${errorBorder}`}
              autoFocus
            />
          );
        }
        return (
          <span
            className="text-xs text-slate-500 truncate block max-w-[140px] cursor-text"
            onDoubleClick={(e) => { e.stopPropagation(); startEdit(task.id, 'tags', task.tags?.join(', ') || ''); }}
          >
            {task.tags && task.tags.length > 0 ? task.tags.join(', ') : <span className="text-slate-400">—</span>}
          </span>
        );

      case 'estimatedEffortHours':
        if (isEditing) {
          return (
            <input
              type="number"
              min="0"
              step="0.5"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCommit(task.id, 'estimateHours', editValue ? Number(editValue) : null);
                if (e.key === 'Escape') setEditingCell(null);
              }}
              onBlur={() => onCommit(task.id, 'estimateHours', editValue ? Number(editValue) : null)}
              className={`w-16 text-xs px-1 py-0.5 border border-indigo-300 rounded focus:outline-none${errorBorder}`}
              autoFocus
            />
          );
        }
        return (
          <span
            className="text-xs text-slate-600 cursor-text"
            onDoubleClick={(e) => {
              e.stopPropagation();
              startEdit(task.id, 'estimatedEffortHours', task.estimateHours != null ? String(task.estimateHours) : '');
            }}
          >
            {task.estimateHours != null ? `${task.estimateHours}h` : <span className="text-slate-400">—</span>}
          </span>
        );

      case 'remainingEffortHours':
        if (isEditing) {
          return (
            <input
              type="number"
              min="0"
              step="0.5"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCommit(task.id, 'remainingHours', editValue ? Number(editValue) : null);
                if (e.key === 'Escape') setEditingCell(null);
              }}
              onBlur={() => onCommit(task.id, 'remainingHours', editValue ? Number(editValue) : null)}
              className={`w-16 text-xs px-1 py-0.5 border border-indigo-300 rounded focus:outline-none${errorBorder}`}
              autoFocus
            />
          );
        }
        return (
          <span
            className="text-xs text-slate-600 cursor-text"
            onDoubleClick={(e) => {
              e.stopPropagation();
              startEdit(task.id, 'remainingEffortHours', task.remainingHours != null ? String(task.remainingHours) : '');
            }}
          >
            {task.remainingHours != null ? `${task.remainingHours}h` : <span className="text-slate-400">—</span>}
          </span>
        );

      case 'schedule': {
        const sched = calculateScheduleInfo({
          startDate: task.startDate,
          dueDate: task.dueDate,
          actualStartDate: task.actualStartDate ?? null,
          actualEndDate: task.actualEndDate ?? null,
        });
        if (sched.plannedDurationDays == null) return <span className="text-xs text-slate-400">—</span>;
        const cfg = SCHEDULE_STATUS_CONFIG[sched.status];
        return (
          <span
            title={`${cfg.label}${sched.endVarianceDays != null ? ` (${sched.endVarianceDays > 0 ? '+' : ''}${sched.endVarianceDays}d)` : ''}`}
            className="inline-flex items-center gap-1"
          >
            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
            <span className={`text-[10px] font-medium ${cfg.color.split(' ')[0]}`}>
              {sched.endVarianceDays != null
                ? `${sched.endVarianceDays > 0 ? '+' : ''}${sched.endVarianceDays}d`
                : cfg.label}
            </span>
          </span>
        );
      }

      default:
        return null;
    }
  };

  /* ---- Render row (memoized for performance) ---- */

  const TaskRow = React.memo(({ task }: { task: WorkTask }) => {
    const isSelected = selectedIds.has(task.id);
    return (
      <tr
        className={`transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
        onClick={() => setSelectedTaskId(task.id)}
      >
        {/* Checkbox — only for editors */}
        {canEditWork && (
        <td className="px-2 py-1.5 w-10" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => toggleSelect(task.id, (e.nativeEvent as MouseEvent).shiftKey)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            data-testid={`task-checkbox-${task.id}`}
          />
        </td>
        )}

        {/* Dynamic columns */}
        {visibleColumns.map((col) => (
          <td
            key={col.id}
            className="px-3 py-1.5"
            onClick={(e) => {
              if (['status', 'priority', 'type', 'assignee', 'phase'].includes(col.id)) e.stopPropagation();
            }}
          >
            {renderCell(task, col.id)}
          </td>
        ))}
      </tr>
    );
  });

  const renderRow = (task: WorkTask) => <TaskRow key={task.id} task={task} />;

  /* ---- Render ---- */

  if (!projectId || !activeWorkspaceId) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <p>Select a workspace and project to view the table.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div data-testid="table-loading">
        <InlineLoadingState message="Loading table..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="table-error">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Error loading table
          </p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={loadData} className="mt-2 text-sm text-red-700 underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="table-root">
      {/* ─── View Toolbar ─── */}
      <ViewToolbar
        viewType="table"
        config={toolbarConfig}
        onChange={(partial) => setToolbarConfig((prev) => ({ ...prev, ...partial }))}
        className="mb-2"
      />

      {/* ─── FilterBar (Sprint 1) ─── */}
      <FilterBar options={filterBarOptions} className="mb-3" />

      {/* ─── Header bar ─── */}
      <div className="mb-3 flex items-center gap-2">
        <Table2 className="h-5 w-5 text-slate-700" />
        <h2 className="text-lg font-semibold text-slate-900">Table</h2>
        <span className="text-sm text-slate-500 ml-2">{sorted.length} tasks</span>

        {/* Column picker toggle */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowColumnPicker(!showColumnPicker)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
            data-testid="column-picker-btn"
          >
            Columns <ChevronDown className="h-3 w-3" />
          </button>
          {showColumnPicker && (
            <div className="absolute right-0 top-8 z-20 bg-white border rounded-lg shadow-lg p-2 w-48" data-testid="column-picker">
              {columns.map((col) => (
                <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => toggleColumn(col.id)}
                    className="h-3 w-3 rounded border-slate-300 text-indigo-600"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>

        {canEditWork && (
          <button
            onClick={() => setShowAddRow(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-md"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </button>
        )}
      </div>

      {/* ─── Bulk Action Bar (B1) — hidden for read-only users ─── */}
      {canEditWork && selectedIds.size > 0 && (
        <div
          className="sticky top-0 z-10 mb-3 flex items-center gap-3 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-2.5"
          data-testid="bulk-action-bar"
        >
          <span className="text-sm font-medium text-indigo-800">
            {selectedIds.size} selected
          </span>

          <select
            value={bulkAction || ''}
            onChange={(e) => { setBulkAction(e.target.value || null); setBulkValue(''); }}
            className="text-xs border rounded px-2 py-1 bg-white"
          >
            <option value="">Choose action...</option>
            <option value="status">Change Status</option>
            <option value="priority">Change Priority</option>
            <option value="assignee">Assign User</option>
            <option value="unassign">Unassign</option>
            {phases.length > 0 && <option value="phase">Move to Phase</option>}
            <option value="delete">Delete</option>
          </select>

          {bulkAction === 'status' && (
            <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="text-xs border rounded px-2 py-1 bg-white">
              <option value="">Select status...</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          )}

          {bulkAction === 'priority' && (
            <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="text-xs border rounded px-2 py-1 bg-white">
              <option value="">Select priority...</option>
              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}

          {bulkAction === 'assignee' && (
            <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="text-xs border rounded px-2 py-1 bg-white">
              <option value="">Select user...</option>
              {members.map((m) => <option key={m.userId} value={m.userId}>{m.name || m.email}</option>)}
            </select>
          )}

          {bulkAction === 'phase' && (
            <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="text-xs border rounded px-2 py-1 bg-white">
              <option value="">Select phase...</option>
              {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          <button
            onClick={handleBulkExecute}
            disabled={bulkProcessing || !bulkAction || (!['delete', 'unassign'].includes(bulkAction) && !bulkValue)}
            className="px-3 py-1 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {bulkProcessing ? 'Processing...' : 'Apply'}
          </button>

          <button
            onClick={() => { setSelectedIds(new Set()); setBulkAction(null); }}
            className="ml-auto text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        </div>
      )}

      {/* ─── Error banner (Sprint 1: single banner for commit errors) ─── */}
      {commitError && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700" data-testid="commit-error-banner">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{commitError.message}</span>
          <button onClick={() => setCommitError(null)} className="ml-auto text-red-500 hover:text-red-700"><X className="h-3 w-3" /></button>
        </div>
      )}

      {/* ─── Bulk error banner (Follow-up B: deterministic error codes) ─── */}
      {bulkError && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800" data-testid="bulk-error-banner">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-medium">[{bulkError.code}]</span>
          <span>{bulkError.message}</span>
          <span className="text-amber-600">({bulkError.failedCount} failed task{bulkError.failedCount > 1 ? 's' : ''} remain selected)</span>
          <button onClick={() => setBulkError(null)} className="ml-auto text-amber-600 hover:text-amber-800"><X className="h-3 w-3" /></button>
        </div>
      )}

      {/* ─── Table ─── */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {/* Select all checkbox */}
              {canEditWork && (
              <th className="px-2 py-2 w-10">
                <input
                  type="checkbox"
                  checked={sorted.length > 0 && selectedIds.size === sorted.length}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  data-testid="select-all-checkbox"
                />
              </th>
              )}
              {visibleColumns.map((col) => (
                <th
                  key={col.id}
                  className={`px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider select-none ${col.width} ${col.sortField ? 'cursor-pointer hover:bg-slate-100' : ''}`}
                  onClick={() => col.sortField && handleSort(col.sortField)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortField && <SortIcon field={col.sortField} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {/* Grouped view (B4) */}
            {groups && !toolbarConfig.search ? (
              groups.map((group) => {
                const isCollapsed = collapsedGroups.has(group.key);
                const groupTasks = getFilteredSorted(group.items);
                return (
                  <React.Fragment key={group.key}>
                    <tr
                      className="bg-slate-50 cursor-pointer hover:bg-slate-100"
                      onClick={() => toggleGroupCollapse(group.key)}
                    >
                      <td colSpan={visibleColumns.length + 1} className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
                          <span className="text-xs font-semibold text-slate-700 uppercase">{group.label}</span>
                          <span className="text-xs text-slate-500">{group.count} tasks</span>
                          <div className="flex-1" />
                          <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${group.completionPercent}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500">{group.completionPercent}%</span>
                        </div>
                      </td>
                    </tr>
                    {!isCollapsed && groupTasks.map((task) => renderRow(task))}
                  </React.Fragment>
                );
              })
            ) : sorted.length === 0 && !showAddRow ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (canEditWork ? 1 : 0)}
                  className="text-center py-12"
                >
                  <p className="text-sm text-slate-500 mb-1">No tasks found</p>
                  <p className="text-xs text-slate-400 mb-4">{canEditWork ? 'Create tasks manually or add a starter set' : 'No tasks match the current filters'}</p>
                  {canEditWork && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setShowAddRow(true)}
                      className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50"
                    >
                      <Plus className="h-3 w-3 inline mr-1" />
                      Add Task
                    </button>
                    {tasks.length === 0 && (
                      <button
                        onClick={handleAddStarterTasks}
                        disabled={addingStarter}
                        className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        data-testid="add-starter-tasks"
                      >
                        {addingStarter ? 'Adding...' : 'Add Starter Tasks (15)'}
                      </button>
                    )}
                  </div>
                  )}
                </td>
              </tr>
            ) : (
              sorted.map((task) => renderRow(task))
            )}

            {/* Inline add row */}
            {showAddRow && (
              <tr className="bg-indigo-50/50">
                <td className="px-3 py-2" colSpan={visibleColumns.length + (canEditWork ? 1 : 0)}>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleInlineCreate();
                        if (e.key === 'Escape') { setShowAddRow(false); setNewTitle(''); }
                      }}
                      placeholder="New task title..."
                      className="flex-1 text-sm px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      autoFocus
                      disabled={creating}
                    />
                    <button
                      onClick={handleInlineCreate}
                      disabled={creating || !newTitle.trim()}
                      className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {creating ? '...' : 'Add'}
                    </button>
                    <button
                      onClick={() => { setShowAddRow(false); setNewTitle(''); }}
                      className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination indicator */}
      {totalCount > PAGE_SIZE && (
        <div className="mt-2 flex items-center justify-between px-1">
          <span className="text-xs text-slate-500">
            Showing {Math.min(sorted.length, PAGE_SIZE)} of {totalCount} tasks
          </span>
        </div>
      )}

      {/* Close column picker when clicking outside */}
      {showColumnPicker && (
        <div className="fixed inset-0 z-10" onClick={() => setShowColumnPicker(false)} />
      )}

      {selectedTaskId && projectId && activeWorkspaceId && (
        <WorkItemDetailPanel
          taskId={selectedTaskId}
          workspaceId={activeWorkspaceId}
          projectId={projectId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
};

export default ProjectTableTab;
