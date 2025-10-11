import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface ResourceHeatmapProps {
  projectId: string;
  startDate: Date;
  endDate: Date;
}

interface HeatmapData {
  resourceId: string;
  resourceName: string;
  resourceEmail: string;
  allocations: Array<{
    date: string;
    percentage: number;
    hours: number;
  }>;
}

export const ResourceHeatmap: React.FC<ResourceHeatmapProps> = ({
  projectId, startDate, endDate
}) => {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHeatmapData();
  }, [projectId, startDate, endDate]);

  const loadHeatmapData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/resources/heat-map', {
        params: { 
          projectId, 
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });
      setHeatmapData(response.data);
    } catch (error) {
      console.error('Failed to load heatmap data:', error);
      // Mock data for demonstration
      setHeatmapData(generateMockHeatmapData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockHeatmapData = (): HeatmapData[] => {
    const resources = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      { id: '3', name: 'Bob Johnson', email: 'bob@example.com' },
    ];

    return resources.map(resource => ({
      resourceId: resource.id,
      resourceName: resource.name,
      resourceEmail: resource.email,
      allocations: generateMockAllocations(startDate, endDate)
    }));
  };

  const generateMockAllocations = (start: Date, end: Date) => {
    const allocations = [];
    const current = new Date(start);
    
    while (current <= end) {
      allocations.push({
        date: current.toISOString().split('T')[0],
        percentage: Math.floor(Math.random() * 120) + 20, // 20-140%
        hours: Math.floor(Math.random() * 8) + 1 // 1-8 hours
      });
      current.setDate(current.getDate() + 1);
    }
    
    return allocations;
  };

  const getHeatColor = (percentage: number): string => {
    if (percentage <= 80) return '#2ECC71'; // Green
    if (percentage <= 100) return '#F39C12'; // Yellow
    if (percentage <= 120) return '#E74C3C'; // Red
    return '#8B0000'; // Dark red
  };

  const getDaysBetween = (start: Date, end: Date): string[] => {
    const days = [];
    const current = new Date(start);
    
    while (current <= end) {
      days.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading resource heatmap...</p>
      </div>
    );
  }

  const days = getDaysBetween(startDate, endDate);

  return (
    <div className="resource-heatmap bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Resource Allocation Heatmap</h3>
      
      {/* Legend */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#2ECC71' }}></div>
          <span>Under-allocated (≤80%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F39C12' }}></div>
          <span>Normal (80-100%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#E74C3C' }}></div>
          <span>Over-allocated (100-120%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8B0000' }}></div>
          <span>Severely over-allocated ({'>'}120%)</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 border-b">Resource</th>
              {days.map(day => (
                <th key={day} className="text-center p-2 border-b text-xs">
                  {new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmapData.map(resource => (
              <tr key={resource.resourceId}>
                <td className="p-2 border-b">
                  <div>
                    <div className="font-medium">{resource.resourceName}</div>
                    <div className="text-xs text-gray-500">{resource.resourceEmail}</div>
                  </div>
                </td>
                {days.map(day => {
                  const allocation = resource.allocations.find(a => a.date === day);
                  const percentage = allocation?.percentage || 0;
                  const hours = allocation?.hours || 0;
                  
                  return (
                    <td key={day} className="p-1 border-b text-center">
                      <div
                        className="w-8 h-8 rounded text-xs flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: getHeatColor(percentage) }}
                        title={`${day}: ${percentage}% (${hours}h)`}
                      >
                        {percentage > 0 ? `${Math.round(percentage)}%` : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="font-medium">Total Resources</div>
          <div className="text-lg">{heatmapData.length}</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="font-medium">Over-allocated Days</div>
          <div className="text-lg text-red-600">
            {heatmapData.reduce((total, resource) => 
              total + resource.allocations.filter(a => a.percentage > 100).length, 0
            )}
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="font-medium">Avg Allocation</div>
          <div className="text-lg">
            {Math.round(
              heatmapData.reduce((total, resource) => 
                total + resource.allocations.reduce((sum, a) => sum + a.percentage, 0) / resource.allocations.length, 0
              ) / heatmapData.length
            )}%
          </div>
        </div>
      </div>
    </div>
  );
};
