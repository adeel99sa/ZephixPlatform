import React, { useMemo } from 'react';
import type { HeatmapResourceRow, HeatmapCell } from '@/types/resourceTimeline';
import { ResourceHeatmapCell } from './ResourceHeatmapCell';

interface ResourceHeatmapGridProps {
  resources: HeatmapResourceRow[];
  dates: string[];
  cells: HeatmapCell[];
}

export const ResourceHeatmapGrid: React.FC<ResourceHeatmapGridProps> = ({
  resources,
  dates,
  cells,
}) => {
  // Build a map for O(1) lookup: key = "resourceId|date"
  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    for (const cell of cells) {
      const key = `${cell.resourceId}|${cell.date}`;
      map.set(key, cell);
    }
    return map;
  }, [cells]);

  // Format date for display (e.g., "Jan 15")
  const formatDateHeader = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            {/* Sticky resource name column */}
            <th className="sticky left-0 z-20 bg-white border border-gray-200 px-4 py-2 text-left font-semibold text-sm text-gray-700 min-w-[200px]">
              Resource
            </th>
            {/* Date headers */}
            {dates.map((date) => (
              <th
                key={date}
                className="border border-gray-200 px-2 py-2 text-center font-medium text-xs text-gray-600 bg-gray-50"
              >
                {formatDateHeader(date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => (
            <tr key={resource.resourceId} className="hover:bg-gray-50">
              {/* Resource name (sticky) */}
              <td className="sticky left-0 z-10 bg-white border border-gray-200 px-4 py-2 font-medium text-sm text-gray-900">
                <div>
                  <div className="font-semibold">{resource.displayName}</div>
                  {resource.role && (
                    <div className="text-xs text-gray-500">{resource.role}</div>
                  )}
                </div>
              </td>
              {/* Cells for each date */}
              {dates.map((date) => {
                const key = `${resource.resourceId}|${date}`;
                const cell = cellMap.get(key) || null;
                return <ResourceHeatmapCell key={date} cell={cell} />;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};



