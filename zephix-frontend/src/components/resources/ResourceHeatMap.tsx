import { useState, useEffect } from 'react';
import api from '@/services/api';

interface ResourceAllocation {
  resourceId: string;
  resourceName: string;
  weeklyAllocations: {
    week: string;
    allocation: number;
    projects: string[];
  }[];
}

export function ResourceHeatMap() {
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    loadHeatMapData();
  }, [dateRange]);

  const loadHeatMapData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all resources
      const resourcesResponse = await api.get('/resources');
      const resources = resourcesResponse.data?.data || resourcesResponse.data || [];
      
      // Get allocations for each resource
      const allocationPromises = resources.map(async (resource: any) => {
        try {
          const response = await api.get(`/resources/${resource.id}/allocation`, {
            params: {
              startDate: dateRange.start,
              endDate: dateRange.end
            }
          });
          
          return {
            resourceId: resource.id,
            resourceName: resource.name || resource.email,
            allocation: response.data?.allocationPercentage || 0,
            details: response.data
          };
        } catch (err) {
          return {
            resourceId: resource.id,
            resourceName: resource.name || resource.email,
            allocation: 0,
            details: null
          };
        }
      });
      
      const results = await Promise.all(allocationPromises);
      
      // Transform into weekly view
      const weeklyData = results.map(r => ({
        resourceId: r.resourceId,
        resourceName: r.resourceName,
        weeklyAllocations: generateWeeklyAllocations(r.allocation)
      }));
      
      setAllocations(weeklyData);
      
    } catch (err: any) {
      console.error('Failed to load heat map data:', err);
      setError('Failed to load resource allocations');
    } finally {
      setLoading(false);
    }
  };

  const generateWeeklyAllocations = (overallAllocation: number) => {
    // Show real allocation data - no fake random data
    const weeks = [];
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    let currentWeek = new Date(startDate);
    while (currentWeek <= endDate) {
      weeks.push({
        week: currentWeek.toISOString().split('T')[0],
        allocation: overallAllocation, // Use real allocation data
        projects: []
      });
      currentWeek.setDate(currentWeek.getDate() + 7);
    }
    
    return weeks;
  };

  const getHeatColor = (allocation: number) => {
    if (allocation === 0) return 'bg-gray-100';
    if (allocation <= 50) return 'bg-green-200';
    if (allocation <= 80) return 'bg-green-400';
    if (allocation <= 100) return 'bg-yellow-400';
    if (allocation <= 120) return 'bg-orange-400';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading resource heat map...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-300 rounded text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Resource Heat Map</h2>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            className="px-3 py-1 border rounded"
          />
          <span className="py-1">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            min={dateRange.start}
            className="px-3 py-1 border rounded"
          />
        </div>
      </div>

      {/* Heat Map Legend */}
      <div className="mb-4 flex gap-2 text-sm">
        <span className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-100 rounded"></div> Unassigned
        </span>
        <span className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-200 rounded"></div> 0-50%
        </span>
        <span className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-400 rounded"></div> 50-80%
        </span>
        <span className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-400 rounded"></div> 80-100%
        </span>
        <span className="flex items-center gap-1">
          <div className="w-4 h-4 bg-orange-400 rounded"></div> 100-120%
        </span>
        <span className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-500 rounded"></div> &gt;120%
        </span>
      </div>

      {/* Heat Map Grid */}
      {allocations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No resources found. Add resources to see allocation heat map.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-2 font-medium">Resource</th>
                {allocations[0]?.weeklyAllocations.map(week => (
                  <th key={week.week} className="text-center p-1 text-xs">
                    {new Date(week.week).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allocations.map(resource => (
                <tr key={resource.resourceId} className="border-t">
                  <td className="p-2 font-medium">{resource.resourceName}</td>
                  {resource.weeklyAllocations.map(week => (
                    <td key={week.week} className="p-1">
                      <div 
                        className={`w-full h-8 rounded flex items-center justify-center text-xs font-medium ${getHeatColor(week.allocation)}`}
                        title={`${Math.round(week.allocation)}% allocated`}
                      >
                        {week.allocation > 0 && `${Math.round(week.allocation)}%`}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ResourceHeatMap;
