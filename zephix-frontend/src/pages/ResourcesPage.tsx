import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/Skeleton';
import api from '../services/api';

interface TaskInfo {
  id: string;
  name: string;
  projectId: string;
}

interface WeekData {
  weekStart: string;
  taskCount: number;
  allocation: number;
  status: 'available' | 'warning' | 'critical';
  tasks: TaskInfo[];
}

interface ResourceData {
  resourceId: string;
  resourceName: string;
  weeks: WeekData[];
}

const ResourcesPage = () => {
  const [heatMapData, setHeatMapData] = useState<ResourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<ResourceData | null>(null);

  useEffect(() => {
    fetchHeatMapData();
  }, []);

  const fetchHeatMapData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/resources/task-heat-map');
      setHeatMapData(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch heat map data:', err);
      setError('Failed to load resource allocation data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'available':
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStatusBadge = (status: string): string => {
    switch (status) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'warning';
      case 'available':
      default:
        return 'success';
    }
  };

  const formatWeekDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Resource Allocation</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchHeatMapData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Resource Capacity Heat Map</h1>
        <button
          onClick={fetchHeatMapData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Heat Map Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Team Allocation Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {heatMapData.length === 0 ? (
            <p className="text-gray-500">No resources found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Resource</th>
                    {heatMapData[0]?.weeks.map((week, idx) => (
                      <th key={idx} className="text-center p-3 font-medium min-w-[100px]">
                        <div className="text-sm">Week {idx + 1}</div>
                        <div className="text-xs text-gray-500">
                          {formatWeekDate(week.weekStart)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatMapData.map((resource) => (
                    <tr
                      key={resource.resourceId}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedResource(resource)}
                    >
                      <td className="p-3 font-medium">{resource.resourceName}</td>
                      {resource.weeks.map((week, idx) => (
                        <td key={idx} className="p-3">
                          <div
                            className={`rounded-lg border p-2 text-center transition-all hover:scale-105 ${getStatusColor(
                              week.status
                            )}`}
                          >
                            <div className="font-bold text-lg">{week.allocation}%</div>
                            <div className="text-xs">
                              {week.taskCount} {week.taskCount === 1 ? 'task' : 'tasks'}
                            </div>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
              <span>Available (≤75%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
              <span>Busy (75-100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
              <span>Overallocated (&gt;100%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resource Detail Modal */}
      {selectedResource && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedResource.resourceName} - Task Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedResource.weeks.map((week, idx) => (
                week.tasks.length > 0 && (
                  <div key={idx}>
                    <h3 className="font-medium mb-2">
                      Week of {formatWeekDate(week.weekStart)} - {week.allocation}% allocated
                    </h3>
                    <ul className="space-y-1 pl-4">
                      {week.tasks.map((task) => (
                        <li key={task.id} className="text-sm text-gray-600">
                          • {task.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              ))}
            </div>
            <button
              onClick={() => setSelectedResource(null)}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResourcesPage;