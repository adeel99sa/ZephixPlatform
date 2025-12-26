import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useResourceTimeline, useResourcesList } from '@/features/resources/api/useResources';
import { ResourceHeatmapGrid } from '@/components/resources/ResourceHeatmapGrid';
import type { HeatmapCell, HeatmapResourceRow } from '@/types/resourceTimeline';

// Feature flag: Check if Resource Intelligence is enabled
const isResourceIntelligenceEnabled = (): boolean => {
  // TODO: Check organization.settings.enableResourceIntelligence
  return true;
};

export const ResourceTimelinePage: React.FC = () => {
  const { id: resourceId } = useParams<{ id: string }>();

  // Feature flag check
  if (!isResourceIntelligenceEnabled()) {
    return <Navigate to="/resources" replace />;
  }

  // Date range state (default: today + next 28 days)
  const today = new Date();
  const defaultEndDate = new Date(today);
  defaultEndDate.setDate(today.getDate() + 28);

  const [fromDate, setFromDate] = useState(
    today.toISOString().split('T')[0],
  );
  const [toDate, setToDate] = useState(
    defaultEndDate.toISOString().split('T')[0],
  );

  // Fetch timeline data
  const { data: timelineData, isLoading, error } = useResourceTimeline(
    resourceId || null,
    fromDate,
    toDate,
  );

  // Fetch resource details for display name
  const { data: resourcesData } = useResourcesList({
    page: 1,
    pageSize: 100,
    search: resourceId || '',
  });

  const resource = resourcesData?.items?.find((r) => r.id === resourceId);

  // Transform timeline data to grid format (single resource row)
  const gridData: {
    resources: HeatmapResourceRow[];
    dates: string[];
    cells: HeatmapCell[];
  } = React.useMemo(() => {
    if (!timelineData || !resourceId) {
      return { resources: [], dates: [], cells: [] };
    }

    const dates = timelineData.map((point) => point.date).sort();
    const cells: HeatmapCell[] = timelineData.map((point) => ({
      resourceId,
      date: point.date,
      capacityPercent: point.capacityPercent,
      hardLoadPercent: point.hardLoadPercent,
      softLoadPercent: point.softLoadPercent,
      classification: point.classification,
    }));

    return {
      resources: [
        {
          resourceId,
          displayName: resource?.name || `Resource ${resourceId.slice(0, 8)}...`,
          role: resource?.role,
        },
      ],
      dates,
      cells,
    };
  }, [timelineData, resourceId, resource]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Resource Timeline
        </h1>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resource ID
            </label>
            <div className="text-sm text-gray-600">{resourceId}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Timeline Grid (single row) */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-gray-500">Loading timeline data...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error loading timeline</div>
          <div className="text-red-600 text-sm mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </div>
      )}

      {!isLoading && !error && gridData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {gridData.resources.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No timeline data available
            </div>
          ) : (
            <ResourceHeatmapGrid
              resources={gridData.resources}
              dates={gridData.dates}
              cells={gridData.cells}
            />
          )}
        </div>
      )}

      {/* Future: Add stacked bar chart here */}
    </div>
  );
};



