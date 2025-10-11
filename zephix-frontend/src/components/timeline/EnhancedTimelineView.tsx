import React, { useState, useEffect, useMemo } from 'react';
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import dayjs from 'dayjs';
import { api } from '../../services/api';

interface TimelineViewProps {
  projectId: string;
  onTaskUpdate?: (taskId: string, updates: any) => Promise<void>;
}

interface TimelineData {
  tasks: Array<{
    id: string;
    name: string;
    start: string | null;
    end: string | null;
    duration: number;
    progress: number;
    dependencies: string[];
    resourceId: string | null;
    isCritical: boolean;
    isMilestone: boolean;
    status: string;
    priority: string;
    estimatedHours: number;
    actualHours: number;
  }>;
  resources: Array<{
    id: string;
    name: string;
    email: string;
    capacity: number;
    resourceType: string;
    isActive: boolean;
  }>;
  criticalPath: string[];
  conflicts: {
    hasConflicts: boolean;
    conflicts: any[];
    totalAllocation: number;
    availableCapacity: number;
  };
}

export function EnhancedTimelineView({ projectId, onTaskUpdate }: TimelineViewProps) {
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [showResourceHeatmap, setShowResourceHeatmap] = useState(false);

  useEffect(() => {
    loadTimelineData();
  }, [projectId]);

  const loadTimelineData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/timeline/project/${projectId}`);
      setTimelineData(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load timeline data:', err);
      setError('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  };

  const ganttTasks: GanttTask[] = useMemo(() => {
    if (!timelineData?.tasks) return [];

    return timelineData.tasks
      .filter(task => task.start && task.end)
      .map(task => ({
        start: new Date(task.start!),
        end: new Date(task.end!),
        name: task.name,
        id: task.id,
        type: task.isMilestone ? 'milestone' : 'task',
        progress: task.progress,
        isDisabled: false,
        styles: {
          backgroundColor: task.isCritical ? '#FF6B6B' : '#4ECDC4',
          backgroundSelectedColor: '#3b82f6',
          progressColor: task.isCritical ? '#FF4444' : '#2ECC71',
        },
        dependencies: task.dependencies || []
      }));
  }, [timelineData]);

  const handleDateChange = async (task: GanttTask) => {
    try {
      await api.post(`/timeline/task/${task.id}/move`, {
        newStartDate: task.start.toISOString().split('T')[0],
        newEndDate: task.end.toISOString().split('T')[0]
      });
      
      // Reload timeline data to get updated dependencies
      await loadTimelineData();
      
      if (onTaskUpdate) {
        await onTaskUpdate(task.id, {
          startDate: task.start.toISOString(),
          endDate: task.end.toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to move task:', err);
      // Reload to revert changes
      await loadTimelineData();
    }
  };

  const handleProgressChange = async (task: GanttTask) => {
    try {
      await api.patch(`/tasks/${task.id}`, {
        progress: task.progress
      });
      
      if (onTaskUpdate) {
        await onTaskUpdate(task.id, {
          progress: task.progress
        });
      }
    } catch (err) {
      console.error('Failed to update task progress:', err);
    }
  };

  const handleDependencyCreate = async (fromTask: string, toTask: string) => {
    try {
      await api.post('/timeline/dependency', {
        predecessorId: fromTask,
        successorId: toTask,
        type: 'finish_to_start'
      });
      
      // Reload timeline data
      await loadTimelineData();
    } catch (err) {
      console.error('Failed to create dependency:', err);
    }
  };

  const handleRecalculate = async () => {
    try {
      await api.post(`/timeline/project/${projectId}/recalculate`);
      await loadTimelineData();
    } catch (err) {
      console.error('Failed to recalculate timeline:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading timeline data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>{error}</p>
        <button 
          onClick={loadTimelineData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!timelineData || ganttTasks.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Timeline Data</h3>
        <p className="text-gray-500 mb-4">
          Tasks need start and end dates to appear in the timeline view.
        </p>
        <p className="text-sm text-gray-400">
          Add dates to your tasks to see them in the Gantt chart.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Project Timeline</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowResourceHeatmap(!showResourceHeatmap)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              {showResourceHeatmap ? 'Hide' : 'Show'} Resource Heatmap
            </button>
            <button
              onClick={handleRecalculate}
              className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
            >
              Recalculate
            </button>
          </div>
        </div>

        {/* View Mode Controls */}
        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => setViewMode(ViewMode.Hour)}
            className={`px-3 py-1 text-sm rounded ${viewMode === ViewMode.Hour ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            Hour
          </button>
          <button 
            onClick={() => setViewMode(ViewMode.Day)}
            className={`px-3 py-1 text-sm rounded ${viewMode === ViewMode.Day ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            Day
          </button>
          <button 
            onClick={() => setViewMode(ViewMode.Week)}
            className={`px-3 py-1 text-sm rounded ${viewMode === ViewMode.Week ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            Week
          </button>
          <button 
            onClick={() => setViewMode(ViewMode.Month)}
            className={`px-3 py-1 text-sm rounded ${viewMode === ViewMode.Month ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            Month
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-6 text-sm">
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            Normal task
          </span>
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            Critical path
          </span>
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            Milestone
          </span>
        </div>
      </div>

      {/* Resource Heatmap */}
      {showResourceHeatmap && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3">Resource Allocation</h4>
          <div className="space-y-2">
            {timelineData.resources.map(resource => (
              <div key={resource.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{resource.name}</span>
                  <span className="text-sm text-gray-500">({resource.email})</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    resource.resourceType === 'full_member' ? 'bg-green-100 text-green-800' :
                    resource.resourceType === 'guest' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {resource.resourceType.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {resource.capacity}h/week
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical Path Info */}
      {timelineData.criticalPath.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-medium text-red-800 mb-2">Critical Path Tasks</h4>
          <div className="text-sm text-red-700">
            {timelineData.criticalPath.length} tasks on critical path
          </div>
        </div>
      )}

      {/* Gantt Chart */}
      <div className="overflow-x-auto">
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          onDateChange={handleDateChange}
          onProgressChange={handleProgressChange}
          onDoubleClick={(task) => setSelectedTask(task.id)}
          listCellWidth="180px"
          columnWidth={viewMode === ViewMode.Month ? 300 : 60}
          locale="en"
        />
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Task Details</h3>
            {(() => {
              const task = timelineData.tasks.find(t => t.id === selectedTask);
              if (!task) return null;
              
              return (
                <div className="space-y-2">
                  <div><strong>Name:</strong> {task.name}</div>
                  <div><strong>Status:</strong> {task.status}</div>
                  <div><strong>Priority:</strong> {task.priority}</div>
                  <div><strong>Progress:</strong> {task.progress}%</div>
                  <div><strong>Estimated Hours:</strong> {task.estimatedHours}</div>
                  <div><strong>Critical Path:</strong> {task.isCritical ? 'Yes' : 'No'}</div>
                  <div><strong>Dependencies:</strong> {task.dependencies.length}</div>
                </div>
              );
            })()}
            <button
              onClick={() => setSelectedTask('')}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

