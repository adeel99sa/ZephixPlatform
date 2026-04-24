/**
 * ProjectTasksTab
 *
 * Tasks tab content - renders the task list for the project.
 * Shared toolbar (filter, group, sort, search, gear) lives in ProjectPageLayout.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ListTodo, Loader2, Settings } from 'lucide-react';
import { useAuth } from '@/state/AuthContext';
import { TaskListSection } from '../components/TaskListSection';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { useProjectContext } from '../layout/ProjectPageLayout';
import { useWorkSurfaceUi } from '../layout/WorkSurfaceUiContext';
import { WaterfallTable } from '../waterfall/WaterfallTable';

export const ProjectTasksTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { customizeViewOpen, setCustomizeViewOpen, gearRef } = useWorkSurfaceUi();

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

  const ctx = useProjectContext();
  const workspaceId = ctx.project?.workspaceId ?? null;

  if (!workspaceId) {
    return (
      <EmptyState
        title="No workspace selected"
        description="Please select a workspace to view tasks."
        icon={<ListTodo className="h-12 w-12" />}
      />
    );
  }

  const isWaterfall =
    (ctx.project?.methodology || '').toLowerCase() === 'waterfall';

  const handleClose = useCallback(() => setCustomizeViewOpen(false), [setCustomizeViewOpen]);

  return (
    <div id="task-list-section">
      {customizeViewOpen && !isWaterfall && (
        <NonWaterfallCustomizePopover onClose={handleClose} anchorRef={gearRef} />
      )}

      {isWaterfall ? (
        <WaterfallTable
          projectId={projectId}
          workspaceId={workspaceId}
          projectName={ctx.project?.name}
          workspaceName={ctx.workspaceDisplayName}
          customizeViewOpen={customizeViewOpen}
          onCustomizeViewClose={handleClose}
          gearAnchorRef={gearRef}
          methodology={ctx.project?.methodology || 'waterfall'}
          currentUserId={user?.id ?? null}
        />
      ) : (
        <TaskListSection
          projectId={projectId}
          workspaceId={workspaceId}
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
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        !(anchorRef?.current && anchorRef.current.contains(target))
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-40 mt-1 w-72 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
      role="dialog"
      aria-label="Customize view"
      data-testid="customize-view-panel"
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <Settings className="h-4 w-4 text-slate-500" />
          Customize view
        </div>
      </div>
      <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <Loader2 className="h-3.5 w-3.5" />
          <span className="font-medium">Coming soon</span>
        </div>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed dark:text-slate-400">
          Column configuration for this project type will be available in a future release.
        </p>
      </div>
    </div>
  );
};

export default ProjectTasksTab;
