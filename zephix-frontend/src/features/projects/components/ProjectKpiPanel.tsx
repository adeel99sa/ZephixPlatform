/**
 * ProjectKpiPanel - MVP KPI toggle component
 * Allows users to activate/deactivate KPIs for a project
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { projectsApi } from '../projects.api';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useWorkspaceStore } from '@/state/workspace.store';

interface KPI {
  id: string;
  name: string;
  description?: string;
  type?: string;
  calculationMethod?: string;
  unit?: string;
  [key: string]: any;
}

interface ProjectKpiPanelProps {
  projectId: string;
  workspaceId: string;
}

export const ProjectKpiPanel: React.FC<ProjectKpiPanelProps> = ({
  projectId,
  workspaceId,
}) => {
  const { isReadOnly } = useWorkspaceRole(workspaceId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableKPIs, setAvailableKPIs] = useState<KPI[]>([]);
  const [activeKpiIds, setActiveKpiIds] = useState<string[]>([]);
  const [localActiveKpiIds, setLocalActiveKpiIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSavedState, setLastSavedState] = useState<string[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load KPI settings on mount
  useEffect(() => {
    if (projectId && workspaceId) {
      loadKpiSettings();
    }
  }, [projectId, workspaceId]);

  const loadKpiSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectsApi.getProjectKpiSettings(projectId);
      setAvailableKPIs(data.availableKPIs);
      setActiveKpiIds(data.activeKpiIds);
      setLocalActiveKpiIds(data.activeKpiIds);
      setLastSavedState(data.activeKpiIds);
    } catch (err: any) {
      console.error('Failed to load KPI settings:', err);
      if (err?.code === 'WORKSPACE_REQUIRED') {
        setError('Please select a workspace first');
      } else {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Failed to load KPI settings',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounced save function
  const saveKpiSettings = useCallback(
    async (newActiveKpiIds: string[]) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          setSaving(true);
          setError(null);
          const data = await projectsApi.updateProjectKpiSettings(
            projectId,
            newActiveKpiIds,
          );
          setActiveKpiIds(data.activeKpiIds);
          setLocalActiveKpiIds(data.activeKpiIds);
          setLastSavedState(data.activeKpiIds);
        } catch (err: any) {
          console.error('Failed to save KPI settings:', err);
          // Revert to last saved state on error
          setLocalActiveKpiIds(lastSavedState);
          setActiveKpiIds(lastSavedState);

          if (err?.response?.status === 403) {
            setError('You do not have permission to update KPIs');
          } else if (err?.response?.status === 400) {
            setError(
              err?.response?.data?.message ||
                'Invalid KPI selection. Some KPIs may not be available.',
            );
          } else {
            setError('Failed to save KPI settings. Please try again.');
          }
        } finally {
          setSaving(false);
        }
      }, 600); // 600ms debounce
    },
    [projectId, lastSavedState],
  );

  const handleToggle = (kpiId: string) => {
    if (isReadOnly || saving) return;

    const newActiveKpiIds = localActiveKpiIds.includes(kpiId)
      ? localActiveKpiIds.filter((id) => id !== kpiId)
      : [...localActiveKpiIds, kpiId];

    // Optimistic update
    setLocalActiveKpiIds(newActiveKpiIds);

    // Debounced save
    saveKpiSettings(newActiveKpiIds);
  };

  const handleManualSave = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveKpiSettings(localActiveKpiIds);
  };

  const getKpiType = (kpi: KPI): 'Computed' | 'Manual' => {
    if (kpi.calculationMethod || kpi.type === 'computed') {
      return 'Computed';
    }
    return 'Manual';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const activeCount = localActiveKpiIds.length;
  const hasChanges = JSON.stringify(localActiveKpiIds) !== JSON.stringify(lastSavedState);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">KPIs</h2>
          <p className="text-sm text-gray-600 mt-1">
            Turn on KPIs you want to track for this project.
          </p>
        </div>
        {hasChanges && !saving && (
          <button
            onClick={handleManualSave}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save
          </button>
        )}
        {saving && (
          <span className="text-sm text-gray-500 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Saving...
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">{activeCount}</span> of{' '}
          {availableKPIs.length} KPIs active
        </p>
      </div>

      {availableKPIs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">
            No KPIs available for this project template.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {availableKPIs.map((kpi) => {
            const isActive = localActiveKpiIds.includes(kpi.id);
            const kpiType = getKpiType(kpi);

            return (
              <div
                key={kpi.id}
                className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {kpi.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        kpiType === 'Computed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {kpiType}
                    </span>
                  </div>
                  {kpi.description && (
                    <p className="text-xs text-gray-600 mt-1">
                      {kpi.description}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(kpi.id)}
                    disabled={isReadOnly || saving}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isActive ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    role="switch"
                    aria-checked={isActive}
                    aria-label={`Toggle ${kpi.name} KPI`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isReadOnly && availableKPIs.length > 0 && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800">
            You have view-only access. Contact a workspace member to modify KPIs.
          </p>
        </div>
      )}
    </div>
  );
};
