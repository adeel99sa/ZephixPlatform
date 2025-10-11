import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

interface TimelineTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies: string[];
  custom_class?: string;
  resourceUtilization?: number;
  resourceName?: string;
  conflicts?: any[];
}

interface TimelineViewProps {
  projectId: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ projectId }) => {
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ganttRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (projectId) {
      loadTimelineData();
    }
  }, [projectId]);

  const loadTimelineData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/projects/${projectId}/timeline`, {
        headers: {
          'x-workspace-id': user?.organizationId || ''
        }
      });
      
      const timelineTasks: TimelineTask[] = response.data.tasks.map((task: any) => ({
        id: task.id,
        name: task.title,
        start: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        end: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress: task.progressPercentage || 0,
        dependencies: task.dependencies || [],
        resourceUtilization: task.resourceUtilization || 0,
        resourceName: task.resourceName || 'Unassigned',
        conflicts: task.conflicts || [],
        custom_class: getUtilizationClass(task.resourceUtilization || 0)
      }));
      
      setTasks(timelineTasks);
      
      // Initialize Gantt chart after data is loaded
      if (ganttRef.current && timelineTasks.length > 0) {
        initializeGanttChart(timelineTasks);
      }
    } catch (error) {
      console.error('Failed to load timeline data:', error);
      setError('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  };

  const getUtilizationClass = (utilization: number): string => {
    if (utilization >= 120) return 'bar-critical';
    if (utilization >= 100) return 'bar-warning';
    if (utilization >= 80) return 'bar-caution';
    return 'bar-normal';
  };

  const initializeGanttChart = (tasks: TimelineTask[]) => {
    if (!ganttRef.current) return;

    // Clear previous chart
    ganttRef.current.innerHTML = '';

    // Create Gantt chart using frappe-gantt
    const gantt = new (window as any).Gantt(ganttRef.current, tasks, {
      header_height: 50,
      column_width: 30,
      step: 24,
      view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
      bar_height: 20,
      bar_corner_radius: 3,
      arrow_curve: 5,
      padding: 18,
      popup_trigger: 'click',
      on_click: (task: TimelineTask) => {
        console.log('Task clicked:', task);
        // Handle task click - could open task details modal
      },
      on_date_change: async (task: TimelineTask, start: Date, end: Date) => {
        try {
          await api.patch(`/tasks/${task.id}`, {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
          });
          // Reload to check for conflicts
          loadTimelineData();
        } catch (error) {
          console.error('Failed to update task:', error);
          // Revert the change
          loadTimelineData();
        }
      },
      on_progress_change: async (task: TimelineTask, progress: number) => {
        try {
          await api.patch(`/tasks/${task.id}`, {
            progressPercentage: progress
          });
        } catch (error) {
          console.error('Failed to update task progress:', error);
        }
      }
    });

    // Add custom CSS for utilization indicators
    const style = document.createElement('style');
    style.textContent = `
      .bar-normal { background-color: #4ade80 !important; }
      .bar-caution { background-color: #fbbf24 !important; }
      .bar-warning { background-color: #f97316 !important; }
      .bar-critical { background-color: #ef4444 !important; }
      .gantt .bar-wrapper .bar {
        position: relative;
      }
      .gantt .bar-wrapper .bar::after {
        content: attr(data-utilization);
        position: absolute;
        right: 4px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 10px;
        color: white;
        font-weight: bold;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
      }
    `;
    document.head.appendChild(style);
  };

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    try {
      await api.patch(`/tasks/${taskId}`, updates);
      loadTimelineData();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading timeline...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading timeline</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-4">
              <button
                onClick={loadTimelineData}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">No tasks found for this project</div>
        <button
          onClick={() => {/* Navigate to create task */}}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create First Task
        </button>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Project Timeline</h2>
        <div className="flex gap-2">
          <button
            onClick={loadTimelineData}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border">
        <div ref={ganttRef} className="gantt-container"></div>
      </div>
      
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-400 rounded"></div>
          <span>Normal (0-79%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-400 rounded"></div>
          <span>Caution (80-99%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-400 rounded"></div>
          <span>Warning (100-119%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Critical (120%+)</span>
        </div>
      </div>
    </div>
  );
};
