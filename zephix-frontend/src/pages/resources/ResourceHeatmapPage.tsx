import React, { useState, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useResourceHeatmap } from '@/features/resources/api/useResources';
import { ResourceHeatmapGrid } from '@/components/resources/ResourceHeatmapGrid';
import { useWorkspaceStore } from '@/state/workspace.store';

// Feature flag: Check if Resource Intelligence is enabled
// For now, default to true. In production, this would check organization settings
const isResourceIntelligenceEnabled = (): boolean => {
  // TODO: Check organization.settings.enableResourceIntelligence
  // For now, always enabled
  return true;
};

export const ResourceHeatmapPage: React.FC = () => {
  const { id: workspaceIdFromRoute } = useParams<{ id: string }>();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  // Feature flag check
  if (!isResourceIntelligenceEnabled()) {
    return <Navigate to="/workspaces" replace />;
  }

  // Use workspaceId from route or active workspace
  const workspaceId = workspaceIdFromRoute || activeWorkspaceId;

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

  // Fetch heatmap data
  const { data, isLoading, error } = useResourceHeatmap(
    workspaceId,
    fromDate,
    toDate,
  );

  // Transform API response to grid format
  const gridData = useMemo(() => {
    if (!data) return { resources: [], dates: [], cells: [] };
    return data;
  }, [data]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Resource Availability Heatmap
        </h1>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workspace
            </label>
            <div className="text-sm text-gray-600">
              {workspaceId ? `Workspace ID: ${workspaceId}` : 'No workspace selected'}
            </div>
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

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="font-semibold text-gray-700">Legend:</div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-availability-none rounded border border-gray-300"></div>
            <span className="text-gray-600">
              🟢 <strong>Safe:</strong> &lt; 80% Load
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-availability-warning rounded border border-gray-300"></div>
            <span className="text-gray-600">
              🟡 <strong>Tentative:</strong> Soft Booking (Striped)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-availability-critical rounded border border-gray-300"></div>
            <span className="text-gray-600">
              🔴 <strong>Critical:</strong> &gt; 100% Load (Justification Required)
            </span>
          </div>
          <div className="text-xs text-gray-500 ml-4">
            Format: Hard%/Soft% (e.g., 80H/20S)
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-gray-500">Loading heatmap data...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error loading heatmap</div>
          <div className="text-red-600 text-sm mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </div>
      )}

      {!isLoading && !error && gridData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {gridData.resources.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No resources found for this workspace and date range
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
    </div>
  );
};






