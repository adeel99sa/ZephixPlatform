import React, { useMemo } from 'react';
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import dayjs from 'dayjs';

interface GanttChartProps {
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

export default function GanttChart({ tasks, onTaskUpdate }: GanttChartProps) {
  const ganttTasks: GanttTask[] = useMemo(() => {
    return tasks.map(task => ({
      start: task.startDate ? new Date(task.startDate) : new Date(),
      end: task.endDate ? new Date(task.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      name: task.name,
      id: task.id,
      type: 'task' as const,
      progress: task.progress || 0,
      dependencies: task.dependencies || [],
      styles: {
        progressColor: task.status === 'completed' ? '#10b981' : 
                      task.status === 'in-progress' ? '#f59e0b' : '#6b7280',
        progressSelectedColor: task.status === 'completed' ? '#059669' : 
                              task.status === 'in-progress' ? '#d97706' : '#4b5563',
      },
    }));
  }, [tasks]);

  const handleTaskChange = async (task: GanttTask) => {
    if (onTaskUpdate) {
      await onTaskUpdate(task.id, {
        startDate: task.start.toISOString(),
        endDate: task.end.toISOString(),
        progress: task.progress,
      });
    }
  };

  return (
    <div className="w-full">
      <Gantt
        tasks={ganttTasks}
        viewMode={ViewMode.Month}
        onDateChange={handleTaskChange}
        onProgressChange={handleTaskChange}
        locale="en"
        barBackgroundColor="#3b82f6"
        barBackgroundSelectedColor="#1d4ed8"
        arrowColor="#6b7280"
        arrowIndent={20}
        todayColor="#ef4444"
        TooltipContent={({ task }) => (
          <div className="p-2 bg-white border rounded shadow-lg">
            <p className="font-medium">{task.name}</p>
            <p className="text-sm text-gray-600">
              {dayjs(task.start).format('MMM DD')} - {dayjs(task.end).format('MMM DD, YYYY')}
            </p>
            <p className="text-sm text-gray-600">Progress: {task.progress}%</p>
          </div>
        )}
      />
    </div>
  );
}
