import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import * as workTasksApi from '@/features/work-management/workTasks.api';
import { api } from '@/lib/api';

export function MyTasksDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<workTasksApi.WorkTask[]>([]);
  const [weeklyCapacity, setWeeklyCapacity] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchMyTasks();
      calculateWeeklyCapacity();
    }
  }, [user?.id]);

  const fetchMyTasks = async () => {
    try {
      const result = await workTasksApi.listTasks({
        assigneeUserId: user?.id,
        limit: 50,
        offset: 0,
      });
      setTasks(result.items);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyCapacity = async () => {
    try {
      const response = await api.get('/resources/my-capacity');
      const data = response as { data?: { capacityPercentage?: number }; success?: boolean };
      setWeeklyCapacity(data?.data?.capacityPercentage ?? (data as any)?.capacityPercentage ?? 0);
    } catch (error) {
      console.error('Failed to calculate capacity:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) return <div className="p-6">Loading your tasks...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Focus</h1>

      {/* Weekly Capacity Meter */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">My Weekly Capacity</h2>
        <div className="flex items-center">
          <div className="flex-1 bg-gray-200 rounded-full h-6 mr-4">
            <div
              className={`h-6 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                weeklyCapacity > 100 ? 'bg-red-500' :
                weeklyCapacity > 80 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(weeklyCapacity, 100)}%` }}
            >
              {weeklyCapacity}%
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {weeklyCapacity > 100 ? 'You are overallocated' :
           weeklyCapacity > 80 ? 'Near full capacity' :
           'Healthy allocation'}
        </p>
      </div>

      {/* My Tasks List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">My Tasks</h2>
        </div>
        <div className="divide-y">
          {tasks.length === 0 ? (
            <div className="p-6 text-gray-500">No tasks assigned</div>
          ) : (
            tasks.map(task => (
              <div key={task.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium">{task.title}</h3>
                    <p className="text-sm text-gray-500">Project: {task.projectId}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className={`text-sm ${getPriorityColor(task.priority?.toLowerCase() ?? 'medium')}`}>
                        {task.priority}
                      </span>
                      <span className="text-sm text-gray-500">
                        Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      task.status === 'DONE' ? 'bg-green-100 text-green-800' :
                      task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      task.status === 'BLOCKED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

