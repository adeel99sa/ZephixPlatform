import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const ResourceHeatMap = () => {
  const [heatMapData, setHeatMapData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeatMap();
  }, []);

  const fetchHeatMap = async () => {
    try {
      // Use the new task-based endpoint
      const response = await api.get('/resources/task-heat-map');
      setHeatMapData(response.data);
    } catch (error) {
      console.error('Failed to fetch heat map:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'available': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100';
    }
  };

  if (loading) return <div className="p-4">Loading resource allocations...</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Team Capacity Overview</h2>
      
      {heatMapData.length === 0 ? (
        <p className="text-gray-500">No resources found</p>
      ) : (
        <div className="space-y-6">
          {heatMapData.map((resource) => (
            <div key={resource.resourceId} className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">
                {resource.resourceName}
              </h3>
              
              <div className="grid grid-cols-4 gap-3">
                {resource.weeks?.map((week, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border ${getStatusColor(week.status)}`}
                  >
                    <div className="text-xs text-gray-600">
                      Week of {week.weekStart}
                    </div>
                    <div className="text-2xl font-bold my-1">
                      {week.taskCount}
                    </div>
                    <div className="text-sm">
                      {week.taskCount === 1 ? 'task' : 'tasks'}
                    </div>
                    <div className="text-xs mt-1 font-medium">
                      {week.allocation}% allocated
                    </div>
                    
                    {/* Show task names on hover/click */}
                    {week.tasks.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer">
                          View tasks
                        </summary>
                        <ul className="text-xs mt-1 space-y-1">
                          {week.tasks.map(task => (
                            <li key={task.id} className="truncate">
                              • {task.name}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Legend */}
      <div className="mt-6 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span>Available (≤3 tasks)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span>Busy (4 tasks)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span>Overloaded (5+ tasks)</span>
        </div>
      </div>
    </div>
  );
};

export default ResourceHeatMap;
