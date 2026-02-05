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

  return (
    <div id="task-list-section">
      <TaskListSection
        projectId={projectId}
        workspaceId={workspaceId}
      />
    </div>
  );
};

export default ProjectTasksTab;
