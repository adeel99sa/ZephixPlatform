import React, { lazy, Suspense } from 'react';
import { Skeleton } from '../ui/feedback/Skeleton';

// Lazy load heavy Gantt chart component
const GanttChart = lazy(() => import('./GanttChart'));

interface TimelineViewProps {
  tasks: Array<{
    id: string;
    name: string;
    startDate?: string;
    endDate?: string;
    progress?: number;
    dependencies?: string[];
    resourceImpactScore?: number;
    status?: string;
  }>;
  onTaskUpdate?: (taskId: string, updates: any) => Promise<void>;
}

export function TimelineView({ tasks, onTaskUpdate }: TimelineViewProps) {
  const validTasks = tasks.filter(task => task.startDate && task.endDate);

  if (validTasks.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Project Timeline</h3>
        <div className="flex gap-4 mt-2 text-sm">
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            Normal allocation
          </span>
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            High allocation (80-100%)
          </span>
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            Overallocated (&gt;100%)
          </span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Suspense fallback={
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        }>
          <GanttChart tasks={validTasks} onTaskUpdate={onTaskUpdate} />
        </Suspense>
      </div>
    </div>
  );
}