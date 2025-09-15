import React, { useState, useEffect } from 'react';
import { Resource } from '../../types/resource.types';
import { resourceService } from '../../services/resourceService';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface ResourceHeatMapProps {
  projectId?: string;
  onResourceSelect?: (resourceId: string) => void;
}

const ResourceHeatMap: React.FC<ResourceHeatMapProps> = ({ projectId, onResourceSelect }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [allocations, setAllocations] = useState<any>({});
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<{ resourceId: string; week: number } | null>(null);

  // Generate 8 weeks of dates
  const getWeekDates = () => {
    const weeks = [];
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay());

    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(startOfWeek);
      weekStart.setDate(startOfWeek.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weeks.push({
        start: weekStart,
        end: weekEnd,
        label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
      });
    }
    return weeks;
  };

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    if (resources.length > 0) {
      loadAllocations();
    }
  }, [resources, currentWeek]);

  const loadResources = async () => {
    try {
      const data = await resourceService.getResources();
      setResources(data);
    } catch (error) {
      console.error('Failed to load resources:', error);
    }
  };

  const loadAllocations = async () => {
    setLoading(true);
    const weeks = getWeekDates();
    const startDate = weeks[0].start.toISOString().split('T')[0];
    const endDate = weeks[7].end.toISOString().split('T')[0];

    const allocationData: any = {};

    for (const resource of resources) {
      try {
        const timeline = await resourceService.getResourceAllocations(
          resource.id,
          startDate,
          endDate
        );
        allocationData[resource.id] = timeline;
      } catch (error) {
        console.error(`Failed to load allocations for ${resource.name}:`, error);
        allocationData[resource.id] = {};
      }
    }

    setAllocations(allocationData);
    setLoading(false);
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage === 0) return 'bg-gray-100';
    if (percentage <= 50) return 'bg-green-100 hover:bg-green-200';
    if (percentage <= 80) return 'bg-green-300 hover:bg-green-400';
    if (percentage <= 100) return 'bg-yellow-300 hover:bg-yellow-400';
    if (percentage <= 120) return 'bg-orange-400 hover:bg-orange-500 text-white';
    return 'bg-red-500 hover:bg-red-600 text-white';
  };

  const getUtilizationForWeek = (resourceId: string, weekIndex: number) => {
    const weeks = getWeekDates();
    const weekKey = weeks[weekIndex].start.toISOString().split('T')[0];
    
    if (!allocations[resourceId] || !allocations[resourceId][weekKey]) {
      return { percentage: 0, hours: 0, tasks: [] };
    }

    const weekData = allocations[resourceId][weekKey];
    return {
      percentage: weekData.allocationPercentage || 0,
      hours: weekData.totalHours || 0,
      tasks: weekData.tasks || []
    };
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  if (loading && resources.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const weeks = getWeekDates();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Resource Heat Map</h2>
        <div className="flex items-center gap-4">
          {/* Week Navigation */}
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium">
            {weeks[0].label} - {weeks[7].label}
          </span>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>

          {/* Legend */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-100 rounded"></div>
              <span>0%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-300 rounded"></div>
              <span>50-80%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-yellow-300 rounded"></div>
              <span>80-100%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-orange-400 rounded"></div>
              <span>100-120%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>&gt;120%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Heat Map Grid */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-4 py-2 text-left text-sm font-medium text-gray-700">
                Resource
              </th>
              {weeks.map((week, idx) => (
                <th key={idx} className="px-2 py-2 text-center text-xs font-medium text-gray-600">
                  <div>{week.label}</div>
                  <div className="text-gray-400">Week {idx + 1}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id} className="border-t">
                <td className="sticky left-0 bg-white px-4 py-3 text-sm font-medium text-gray-900">
                  <div>{resource.name}</div>
                  <div className="text-xs text-gray-500">{resource.role}</div>
                </td>
                {weeks.map((week, weekIdx) => {
                  const utilization = getUtilizationForWeek(resource.id, weekIdx);
                  const isHovered = hoveredCell?.resourceId === resource.id && hoveredCell?.week === weekIdx;

                  return (
                    <td key={weekIdx} className="px-2 py-2">
                      <div
                        className={`relative h-12 rounded cursor-pointer transition-all ${getUtilizationColor(utilization.percentage)} flex items-center justify-center`}
                        onMouseEnter={() => setHoveredCell({ resourceId: resource.id, week: weekIdx })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => onResourceSelect?.(resource.id)}
                      >
                        <span className="text-xs font-semibold">
                          {utilization.percentage > 0 ? `${Math.round(utilization.percentage)}%` : '-'}
                        </span>

                        {/* Tooltip */}
                        {isHovered && utilization.percentage > 0 && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10 w-48">
                            <div className="font-semibold mb-1">{resource.name}</div>
                            <div>Hours: {utilization.hours}/{resource.capacityHoursPerWeek}</div>
                            <div>Utilization: {utilization.percentage}%</div>
                            {utilization.tasks.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-gray-700">
                                <div className="font-semibold">Tasks:</div>
                                {utilization.tasks.map((task: any, idx: number) => (
                                  <div key={idx}>• {task.taskName || task.projectName}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
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
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-2xl font-bold">{resources.length}</div>
          <div className="text-sm text-gray-600">Total Resources</div>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <div className="text-2xl font-bold text-green-600">
            {resources.filter(r => {
              const util = getUtilizationForWeek(r.id, 0);
              return util.percentage <= 80;
            }).length}
          </div>
          <div className="text-sm text-gray-600">Available</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded">
          <div className="text-2xl font-bold text-yellow-600">
            {resources.filter(r => {
              const util = getUtilizationForWeek(r.id, 0);
              return util.percentage > 80 && util.percentage <= 100;
            }).length}
          </div>
          <div className="text-sm text-gray-600">Near Capacity</div>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <div className="text-2xl font-bold text-red-600">
            {resources.filter(r => {
              const util = getUtilizationForWeek(r.id, 0);
              return util.percentage > 100;
            }).length}
          </div>
          <div className="text-sm text-gray-600">Overallocated</div>
        </div>
      </div>
    </div>
  );
};

export default ResourceHeatMap;
