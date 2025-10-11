import React, { useState, useEffect } from 'react';
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import { timelineService } from '../../services/timeline.service';
import "gantt-task-react/dist/index.css";

interface SimpleTimelineViewProps {
  projectId: string;
}

export const SimpleTimelineView: React.FC<SimpleTimelineViewProps> = ({ projectId }) => {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);

  useEffect(() => {
    loadTimelineData();
  }, [projectId]);

  const loadTimelineData = async () => {
    try {
      setLoading(true);
      const data = await timelineService.getTimelineData(projectId);
      
      // Convert backend data to Gantt format
      const ganttTasks = data.tasks
        .filter((task: any) => task.start && task.end) // Filter out invalid dates
        .map((task: any) => ({
          id: task.id,
          name: task.name || 'Unnamed Task',
          start: new Date(task.start),
          end: new Date(task.end),
          progress: task.progress || 0,
          type: task.isMilestone ? 'milestone' : 'task',
          dependencies: task.dependencies || [],
        }));
      
      setTasks(ganttTasks);
    } catch (error) {
      console.error('Failed to load timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskChange = async (task: GanttTask) => {
    try {
      await timelineService.moveTask(task.id, task.start.toISOString());
      await loadTimelineData(); // Reload to get cascaded changes
    } catch (error) {
      console.error('Failed to move task:', error);
    }
  };

  if (loading) {
    return <div className="p-4">Loading timeline...</div>;
  }

  if (tasks.length === 0) {
    return <div className="p-4">No tasks with valid dates to display</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex gap-2">
        <button 
          onClick={() => setViewMode(ViewMode.Day)}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Day
        </button>
        <button 
          onClick={() => setViewMode(ViewMode.Week)}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Week
        </button>
        <button 
          onClick={() => setViewMode(ViewMode.Month)}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Month
        </button>
      </div>
      
      <Gantt
        tasks={tasks}
        viewMode={viewMode}
        onDateChange={handleTaskChange}
        listCellWidth="155px"
      />
    </div>
  );
};