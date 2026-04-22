/**
 * ProjectTasksTab
 *
 * Tasks tab content - renders the task list for the project.
 * Gear icon + project actions menu live here so they're available for ALL methodologies.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowDownUp,
  Filter,
  Layers,
  ListTodo,
  Loader2,
  Search,
  Settings,
  Shield,
  UserSquare2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { TaskListSection } from '../components/TaskListSection';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { useProjectContext } from '../layout/ProjectPageLayout';
import { WaterfallTable } from '../waterfall/WaterfallTable';
import { projectShowsGovernanceIndicator } from '../projects.api';

export const ProjectTasksTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId: workspaceId } = useWorkspaceStore();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [taskSearch, setTaskSearch] = useState('');
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  // Shared gear icon state — controls the customize view panel for all methodologies.
  const [customizeViewOpen, setCustomizeViewOpen] = useState(false);
  /** Bumped when the table + header opens Fields while the panel is already open. */
  const [customizeFieldsFocusKey, setCustomizeFieldsFocusKey] = useState(0);
  const gearRef = useRef<HTMLButtonElement>(null);

  // Avoid stale focus key when the panel remounts (e.g. open via gear after using +).
  useEffect(() => {
    if (!customizeViewOpen) {
      setCustomizeFieldsFocusKey(0);
    }
  }, [customizeViewOpen]);

  // Handle taskId highlight from URL
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId) {
      setTimeout(() => {
        const taskRow = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskRow) {
          taskRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          taskRow.classList.add('ring-2', 'ring-blue-500');
          setTimeout(() => {
            taskRow.classList.remove('ring-2', 'ring-blue-500');
          }, 3000);
        }
      }, 500);
    }
  }, [searchParams]);

  if (!projectId) {
    return (
      <EmptyState
        title="Project not found"
        description="Unable to load tasks without a project."
        icon={<ListTodo className="h-12 w-12" />}
      />
    );
  }

  if (!workspaceId) {
    return (
      <EmptyState
        title="No workspace selected"
        description="Please select a workspace to view tasks."
        icon={<ListTodo className="h-12 w-12" />}
      />
    );
  }

  const ctx = useProjectContext();
  const isWaterfall =
    (ctx.project?.methodology || '').toLowerCase() === 'waterfall';

  const handleClose = useCallback(() => setCustomizeViewOpen(false), []);

  const openCustomizeToFields = useCallback(() => {
    setCustomizeViewOpen(true);
    setCustomizeFieldsFocusKey((k) => k + 1);
  }, []);

  return (
    <div id="task-list-section">
      {/* Shared toolbar — visible for ALL methodologies */}
      <div className="mb-2 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex items-center gap-2">
          {projectShowsGovernanceIndicator(ctx.project) && (
            <div
              className="flex items-center gap-1 text-[11px] text-purple-600"
              title="Governance policies from this project's template may apply. You will be notified if an action needs an admin-approved exception."
            >
              <Shield className="h-3.5 w-3.5 shrink-0 text-purple-500" aria-hidden />
              <span className="hidden sm:inline">Policies active</span>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
          <div className="relative min-w-[10rem] max-w-md flex-1">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              placeholder="Search tasks…"
              aria-label="Search tasks"
              data-testid="project-tasks-toolbar-search"
              className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          <button
            type="button"
            onClick={() => toast.message('Filters are not available yet.')}
            aria-label="Filter tasks (coming soon)"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-blue-900"
            data-testid="project-tasks-toolbar-filter"
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Filter
          </button>
          <button
            type="button"
            onClick={() => toast.message('Group by is not available yet.')}
            aria-label="Group tasks (coming soon)"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-blue-900"
            data-testid="project-tasks-toolbar-group"
          >
            <Layers className="h-3.5 w-3.5" aria-hidden />
            Group
          </button>
          <button
            type="button"
            onClick={() => toast.message('Sort is not available yet.')}
            aria-label="Sort tasks (coming soon)"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-blue-900"
            data-testid="project-tasks-toolbar-sort"
          >
            <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
            Sort
          </button>
          <button
            type="button"
            aria-pressed={myTasksOnly}
            aria-label="Show only my assigned tasks"
            onClick={() => setMyTasksOnly((v) => !v)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 ${
              myTasksOnly
                ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
            data-testid="project-tasks-toolbar-my-tasks"
            title="Show only tasks assigned to you"
          >
            <UserSquare2 className="h-3.5 w-3.5" aria-hidden />
            My tasks
          </button>
        {/* Gear icon */}
        <div className="relative">
          <button
            ref={gearRef}
            type="button"
            onClick={() => setCustomizeViewOpen((v) => !v)}
            aria-label="Customize view"
            data-testid="customize-view-button"
            title="Customize view (fields, filters, grouping)"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:focus:ring-blue-900"
          >
            <Settings className="h-4 w-4" />
          </button>

          {customizeViewOpen && !isWaterfall && (
            <NonWaterfallCustomizePopover onClose={handleClose} anchorRef={gearRef} />
          )}
        </div>
        </div>
      </div>

      {/* Methodology-specific content */}
      {isWaterfall ? (
        <WaterfallTable
          projectId={projectId}
          workspaceId={workspaceId}
          customizeViewOpen={customizeViewOpen}
          onCustomizeViewClose={handleClose}
          gearAnchorRef={gearRef}
          onOpenCustomizeToFields={openCustomizeToFields}
          customizeFieldsFocusKey={customizeFieldsFocusKey}
          methodology={ctx.project?.methodology || 'waterfall'}
          clientTaskSearch={taskSearch}
          myTasksOnly={myTasksOnly}
          currentUserId={user?.id ?? null}
        />
      ) : (
        <TaskListSection
          projectId={projectId}
          workspaceId={workspaceId}
          clientTaskSearch={taskSearch}
          myTasksOnly={myTasksOnly}
          methodology={ctx.project?.methodology ?? null}
        />
      )}
    </div>
  );
};

/** Lightweight popover for non-waterfall projects. */
const NonWaterfallCustomizePopover: React.FC<{
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}> = ({ onClose, anchorRef }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)
          && !(anchorRef?.current && anchorRef.current.contains(target))) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-40 mt-1 w-72 rounded-lg border border-slate-200 bg-white shadow-xl"
      role="dialog"
      aria-label="Customize view"
      data-testid="customize-view-panel"
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Settings className="h-4 w-4 text-slate-500" />
          Customize view
        </div>
      </div>
      <div className="border-t border-slate-200 px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <Loader2 className="h-3.5 w-3.5" />
          <span className="font-medium">Coming soon</span>
        </div>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          Column configuration for this project type will be available in a future release.
        </p>
      </div>
    </div>
  );
};

export default ProjectTasksTab;
