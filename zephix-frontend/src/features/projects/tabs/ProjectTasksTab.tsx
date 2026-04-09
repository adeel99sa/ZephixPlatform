/**
 * ProjectTasksTab
 * 
 * Tasks tab content - renders the task list for the project.
 */

import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ListTodo } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { TaskListSection } from '../components/TaskListSection';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { useProjectContext } from '../layout/ProjectPageLayout';
import { WaterfallTable } from '../waterfall/WaterfallTable';

export const ProjectTasksTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId: workspaceId } = useWorkspaceStore();
  const [searchParams] = useSearchParams();

  // Handle taskId highlight from URL
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId) {
      // Scroll to and highlight the task after a short delay
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

  // Phase 5B.1 — Waterfall projects render the dedicated WaterfallTable.
  // All other methodologies keep the existing TaskListSection unchanged.
  // Reading methodology from ProjectContext (loaded by ProjectPageLayout)
  // means this component does not refetch the project itself.
  // ctx.project may be null briefly while the layout is still loading the
  // project; in that case we render the legacy list to avoid a flash of the
  // "Project not found" empty state. The layout always resolves before tasks
  // can render anything meaningful, so this is a safe default.
  const ctx = useProjectContext();
  const isWaterfall =
    (ctx.project?.methodology || '').toLowerCase() === 'waterfall';

  return (
    <div id="task-list-section">
      {isWaterfall ? (
        <WaterfallTable projectId={projectId} workspaceId={workspaceId} />
      ) : (
        <TaskListSection projectId={projectId} workspaceId={workspaceId} />
      )}
    </div>
  );
};

export default ProjectTasksTab;
