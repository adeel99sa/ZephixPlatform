import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface ResourceData {
  id: string;
  name: string;
  utilization: number[];
  conflicts: string[];
  weeklyCapacity: number;
  costPerHour: number;
}

interface HeatmapGridProps {
  organizationId: string;
}

export const HeatmapGrid: React.FC<HeatmapGridProps> = ({ organizationId }) => {
  const [heatmapData, setHeatmapData] = useState<ResourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    loadHeatmapData();
  }, [organizationId, dateRange]);

  const loadHeatmapData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/resources/heatmap', {
        params: {
          startDate: dateRange.start,
          endDate: dateRange.end,
          weeks: 1
        }
      });
      
      if (response.data && response.data.resources) {
        setHeatmapData(response.data.resources);
      } else {
        // Fallback test data if no real data
        setHeatmapData([
          {
            id: 'resource-1',
            name: 'John Doe',
            utilization: [85, 120, 95, 110, 75, 90, 105],
            conflicts: ['Day 2: 120% utilization', 'Day 4: 110% utilization'],
            weeklyCapacity: 40,
            costPerHour: 75
          },
          {
            id: 'resource-2',
            name: 'Jane Smith',
            utilization: [60, 70, 80, 65, 55, 70, 75],
            conflicts: [],
            weeklyCapacity: 40,
            costPerHour: 85
          },
          {
            id: 'resource-3',
            name: 'Mike Johnson',
            utilization: [95, 105, 115, 125, 110, 100, 90],
            conflicts: ['Day 2: 105% utilization', 'Day 3: 115% utilization', 'Day 4: 125% utilization'],
            weeklyCapacity: 40,
            costPerHour: 65
          }
        ]);
      }
    } catch (err: any) {
      console.error('Failed to load heatmap data:', err);
      setError(err.response?.data?.message || 'Failed to load heatmap data');
      
      // Fallback test data on error
      setHeatmapData([
        {
          id: 'error-fallback-1',
          name: 'Fallback Resource',
          utilization: [80, 90, 100, 110, 95, 85, 75],
          conflicts: ['Day 4: 110% utilization'],
          weeklyCapacity: 40,
          costPerHour: 50
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getCellColor = (utilization: number): string => {
    if (utilization > 120) return 'bg-red-500 text-white';
    if (utilization > 100) return 'bg-orange-400 text-white';
    if (utilization > 80) return 'bg-yellow-300 text-black';
    if (utilization > 50) return 'bg-green-300 text-black';
    return 'bg-gray-200 text-gray-600';
  };

  const getCellTooltip = (resource: ResourceData, dayIndex: number, utilization: number): string => {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayName = dayNames[dayIndex];
    const conflict = resource.conflicts.find(c => c.includes(dayName));
    
    return `${resource.name} - ${dayName}: ${utilization}% utilization${conflict ? ` (${conflict})` : ''}`;
  };

  const generateDateHeaders = (): string[] => {
    const dates = [];
    const startDate = new Date(dateRange.start);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }
    
    return dates;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading heatmap...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadHeatmapData}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dateHeaders = generateDateHeaders();

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Resource Utilization Heatmap</h3>
        <div className="text-sm text-gray-600">
          {heatmapData.length} resource{heatmapData.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="mb-4 flex gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={loadHeatmapData}
          className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 p-3 text-left font-semibold">Resource</th>
              {dateHeaders.map((date, index) => (
                <th key={index} className="border border-gray-300 p-3 text-center font-semibold">
                  {date}
                </th>
              ))}
              <th className="border border-gray-300 p-3 text-center font-semibold">Avg</th>
              <th className="border border-gray-300 p-3 text-center font-semibold">Conflicts</th>
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((resource) => {
              const averageUtilization = Math.round(
                resource.utilization.reduce((sum, val) => sum + val, 0) / resource.utilization.length
              );
              
              return (
                <tr key={resource.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-3 font-medium">
                    <div>
                      <div className="font-semibold">{resource.name}</div>
                      <div className="text-xs text-gray-500">
                        {resource.weeklyCapacity}h/week • ${resource.costPerHour}/h
                      </div>
                    </div>
                  </td>
                  {resource.utilization.map((utilization, dayIndex) => (
                    <td
                      key={dayIndex}
                      className={`border border-gray-300 p-3 text-center font-medium cursor-pointer hover:opacity-80 ${getCellColor(utilization)}`}
                      title={getCellTooltip(resource, dayIndex, utilization)}
                    >
                      {utilization}%
                    </td>
                  ))}
                  <td className="border border-gray-300 p-3 text-center font-medium">
                    <span className={`px-2 py-1 rounded text-sm ${getCellColor(averageUtilization)}`}>
                      {averageUtilization}%
                    </span>
                  </td>
                  <td className="border border-gray-300 p-3 text-center">
                    {resource.conflicts.length > 0 ? (
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                        {resource.conflicts.length}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <span>0-50% (Low)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-300 rounded"></div>
          <span>50-80% (Good)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-300 rounded"></div>
          <span>80-100% (High)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-400 rounded"></div>
          <span>100-120% (Warning)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>&gt;120% (Critical)</span>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>• Hover over cells to see detailed utilization information</p>
        <p>• Red cells indicate resource conflicts that need attention</p>
        <p>• Click on cells to view task details (coming soon)</p>
      </div>
    </div>
  );
};
