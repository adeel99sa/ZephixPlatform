import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useResourcesList,
  useCapacitySummary,
  useCapacityBreakdown,
  useSkillsFacet,
  useResourceAllocations,
  useResourceRiskScore,
  useWorkspaceResourceRiskSummary,
  type ResourceListFilters,
} from '../api/useResources';
import ResourceHeatmap from '../components/ResourceHeatmap';
import { useWorkspaceStore } from '@/state/workspace.store';
import { listWorkspaces } from '@/features/workspaces/api';
import type { Workspace } from '@/features/workspaces/types';
import { isResourceRiskAIEnabled } from '@/lib/flags';

// Severity color utilities
function getSeverityBgColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'bg-red-100';
    case 'high': return 'bg-orange-100';
    case 'medium': return 'bg-yellow-100';
    case 'low': return 'bg-green-100';
    default: return 'bg-gray-50';
  }
}

function getSeverityColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'badge-error';
    case 'high': return 'badge-warning';
    case 'medium': return 'badge-info';
    case 'low': return 'badge-success';
    default: return 'badge-ghost';
  }
}

export default function ResourcesPage() {
  const [sp, setSp] = useSearchParams();
  const { activeWorkspaceId } = useWorkspaceStore();

  // URL params
  const page = Number(sp.get('page') || 1);
  const pageSize = Number(sp.get('pageSize') || 20);
  const search = sp.get('search') || '';
  const dept = sp.get('dept') || '';

  // Filter state
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    sp.get('skills') ? sp.get('skills')!.split(',') : []
  );
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    sp.get('roles') ? sp.get('roles')!.split(',') : []
  );
  const [workspaceFilter, setWorkspaceFilter] = useState<string>(
    sp.get('workspaceId') || ''
  );

  // Date range - default to next 4 weeks
  const defaultDateFrom = new Date().toISOString().split('T')[0];
  const defaultDateTo = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState<string>(
    sp.get('dateFrom') || defaultDateFrom
  );
  const [dateTo, setDateTo] = useState<string>(
    sp.get('dateTo') || defaultDateTo
  );

  // Selected resource for detail panel
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    sp.get('selected') || null
  );

  // Workspaces for filter
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  // Load workspaces
  useEffect(() => {
    listWorkspaces().then(setWorkspaces).catch(console.error);
  }, []);

  // Build filters object
  const filters: ResourceListFilters = {
    search,
    dept,
    skills: selectedSkills.length > 0 ? selectedSkills : undefined,
    roles: selectedRoles.length > 0 ? selectedRoles : undefined,
    workspaceId: workspaceFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize,
  };

  // Feature flag check
  const riskAIEnabled = isResourceRiskAIEnabled();

  // Fetch data
  const { data, isLoading, error } = useResourcesList(filters);
  const { data: capacitySummary, isLoading: capacityLoading } = useCapacitySummary(
    dateFrom,
    dateTo,
    workspaceFilter || undefined
  );
  const { data: skillsFacet, isLoading: skillsLoading } = useSkillsFacet();
  const { data: breakdown, isLoading: breakdownLoading } = useCapacityBreakdown(
    selectedResourceId,
    dateFrom,
    dateTo
  );

  // Risk scoring data (only if feature enabled)
  const { data: riskScore, isLoading: riskScoreLoading, error: riskScoreError } = useResourceRiskScore(
    selectedResourceId,
    dateFrom,
    dateTo,
    riskAIEnabled
  );

  // Workspace risk summary (only if feature enabled and workspace filter is set)
  const effectiveWorkspaceId = workspaceFilter || activeWorkspaceId;
  const { data: workspaceRiskSummary, isLoading: workspaceRiskLoading } = useWorkspaceResourceRiskSummary(
    effectiveWorkspaceId || null,
    dateFrom,
    dateTo,
    10, // limit
    0, // minRiskScore
    riskAIEnabled && !!effectiveWorkspaceId
  );

  // Create capacity map for quick lookup
  const capacityMap = new Map(
    (capacitySummary || []).map((s) => [s.id, s])
  );

  // Get unique roles from resources
  const availableRoles = Array.from(
    new Set((data?.items || []).map((r) => r.role).filter(Boolean))
  ).sort();

  function update(key: string, val: string) {
    const next = new URLSearchParams(sp);
    if (val) next.set(key, val);
    else next.delete(key);
    setSp(next, { replace: true });
  }

  function updateFilters() {
    const next = new URLSearchParams(sp);

    if (selectedSkills.length > 0) {
      next.set('skills', selectedSkills.join(','));
    } else {
      next.delete('skills');
    }

    if (selectedRoles.length > 0) {
      next.set('roles', selectedRoles.join(','));
    } else {
      next.delete('roles');
    }

    if (workspaceFilter) {
      next.set('workspaceId', workspaceFilter);
    } else {
      next.delete('workspaceId');
    }

    if (dateFrom) {
      next.set('dateFrom', dateFrom);
    } else {
      next.delete('dateFrom');
    }

    if (dateTo) {
      next.set('dateTo', dateTo);
    } else {
      next.delete('dateTo');
    }

    setSp(next, { replace: true });
  }

  function handleSkillToggle(skill: string) {
    const newSkills = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    setSelectedSkills(newSkills);
    setTimeout(updateFilters, 0);
  }

  function handleRoleToggle(role: string) {
    const newRoles = selectedRoles.includes(role)
      ? selectedRoles.filter((r) => r !== role)
      : [...selectedRoles, role];
    setSelectedRoles(newRoles);
    setTimeout(updateFilters, 0);
  }

  function handleWorkspaceChange(workspaceId: string) {
    setWorkspaceFilter(workspaceId);
    setTimeout(() => {
      const next = new URLSearchParams(sp);
      if (workspaceId) {
        next.set('workspaceId', workspaceId);
      } else {
        next.delete('workspaceId');
      }
      setSp(next, { replace: true });
    }, 0);
  }

  function handleDateRangeChange(from: string, to: string) {
    setDateFrom(from);
    setDateTo(to);
    setTimeout(() => {
      const next = new URLSearchParams(sp);
      if (from) next.set('dateFrom', from);
      else next.delete('dateFrom');
      if (to) next.set('dateTo', to);
      else next.delete('dateTo');
      setSp(next, { replace: true });
    }, 0);
  }

  function handleResourceSelect(resourceId: string) {
    if (selectedResourceId === resourceId) {
      setSelectedResourceId(null);
      const next = new URLSearchParams(sp);
      next.delete('selected');
      setSp(next, { replace: true });
    } else {
      setSelectedResourceId(resourceId);
      const next = new URLSearchParams(sp);
      next.set('selected', resourceId);
      setSp(next, { replace: true });
    }
  }

  function getUtilizationColor(percentage: number): string {
    if (percentage <= 80) return 'bg-green-100 text-green-800';
    if (percentage <= 100) return 'bg-blue-100 text-blue-800';
    if (percentage <= 120) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }

  if (error) return <div role="alert">Something went wrong</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Resource Center</h1>
      </div>

      {/* Workspace Risk Summary (if enabled) */}
      {riskAIEnabled && workspaceRiskSummary && workspaceRiskSummary.summary.totalResources > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-sm font-semibold mb-2">Risk Overview</h2>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Total Resources</div>
              <div className="font-medium">{workspaceRiskSummary.summary.totalResources}</div>
            </div>
            <div>
              <div className="text-gray-500">High Risk</div>
              <div className="font-medium text-red-600">{workspaceRiskSummary.summary.highRiskCount}</div>
            </div>
            <div>
              <div className="text-gray-500">Medium Risk</div>
              <div className="font-medium text-yellow-600">{workspaceRiskSummary.summary.mediumRiskCount}</div>
            </div>
            <div>
              <div className="text-gray-500">Avg Risk Score</div>
              <div className="font-medium">{workspaceRiskSummary.summary.averageRiskScore.toFixed(1)}</div>
            </div>
          </div>
          {workspaceRiskSummary.highRiskResources.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs text-gray-500 mb-2">Top High-Risk Resources:</div>
              <div className="flex flex-wrap gap-2">
                {workspaceRiskSummary.highRiskResources.slice(0, 3).map((resource) => (
                  <button
                    key={resource.resourceId}
                    onClick={() => handleResourceSelect(resource.resourceId)}
                    className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                  >
                    {resource.resourceName} ({resource.riskScore})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              className="input input-bordered w-full"
              placeholder="Name or role"
              value={search}
              onChange={(e) => update('search', e.target.value)}
            />
          </div>

          {/* Skills Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Skills</label>
            <div className="relative">
              <select
                className="select select-bordered w-full"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleSkillToggle(e.target.value);
                    e.target.value = '';
                  }
                }}
                disabled={skillsLoading}
              >
                <option value="">Select skill...</option>
                {(skillsFacet || []).map((skill) => (
                  <option key={skill.name} value={skill.name}>
                    {skill.name} ({skill.count})
                  </option>
                ))}
              </select>
              {skillsLoading && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  Loading...
                </span>
              )}
            </div>
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="badge badge-primary badge-sm cursor-pointer"
                    onClick={() => handleSkillToggle(skill)}
                  >
                    {skill} ×
                  </span>
                ))}
              </div>
            )}
            {skillsFacet && skillsFacet.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">No skills available</p>
            )}
          </div>

          {/* Roles Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Roles</label>
            <div className="relative">
              <select
                className="select select-bordered w-full"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleRoleToggle(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">Select role...</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            {selectedRoles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedRoles.map((role) => (
                  <span
                    key={role}
                    className="badge badge-secondary badge-sm cursor-pointer"
                    onClick={() => handleRoleToggle(role)}
                  >
                    {role} ×
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Workspace Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Workspace</label>
            <select
              className="select select-bordered w-full"
              value={workspaceFilter}
              onChange={(e) => handleWorkspaceChange(e.target.value)}
            >
              <option value="">All workspaces</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
        </div>

          {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="date-from" className="block text-sm font-medium mb-1">Date From</label>
            <input
              id="date-from"
              type="date"
              className="input input-bordered w-full"
              value={dateFrom}
              onChange={(e) => handleDateRangeChange(e.target.value, dateTo)}
            />
          </div>
          <div>
            <label htmlFor="date-to" className="block text-sm font-medium mb-1">Date To</label>
            <input
              id="date-to"
              type="date"
              className="input input-bordered w-full"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => handleDateRangeChange(dateFrom, e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-4">
        {/* Resource Table */}
        <div className={`flex-1 ${selectedResourceId ? 'w-2/3' : 'w-full'}`}>
          {isLoading && <div>Loading resources...</div>}
          {!isLoading && data && (
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Skills</th>
                    <th>Capacity</th>
                    <th>Utilization</th>
                    <th>Heatmap</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => {
                    const capacity = capacityMap.get(r.id);
                    const isSelected = selectedResourceId === r.id;

                    return (
                      <tr
                        key={r.id}
                        className={`hover cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                        onClick={() => handleResourceSelect(r.id)}
                      >
                        <td>{r.name || r.email}</td>
                        <td>{r.role}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {(r.skills || []).slice(0, 3).map((skill) => (
                              <span key={skill} className="badge badge-outline badge-sm">
                                {skill}
                              </span>
                            ))}
                            {(r.skills || []).length > 3 && (
                              <span className="badge badge-outline badge-sm">
                                +{(r.skills || []).length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {capacityLoading ? (
                            <span className="text-xs text-gray-400">...</span>
                          ) : capacity ? (
                            <span className="text-sm">
                              {capacity.totalAllocatedHours.toFixed(1)}h / {capacity.totalCapacityHours.toFixed(1)}h
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td>
                          {capacityLoading ? (
                            <span className="text-xs text-gray-400">...</span>
                          ) : capacity ? (
                            <span
                              className={`badge badge-sm ${getUtilizationColor(capacity.utilizationPercentage)}`}
                            >
                              {capacity.utilizationPercentage}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td>
                          <ResourceAllocationHeatmap resourceId={r.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {data.items.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No resources found matching your filters.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resource Detail Panel */}
        {selectedResourceId && (
          <div className="w-1/3 bg-white rounded-lg border p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Resource Details</h2>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => handleResourceSelect(selectedResourceId)}
              >
                ×
              </button>
            </div>

            {/* Risk Score Section (if enabled) */}
            {riskAIEnabled && (
              <div className={`mb-4 p-3 rounded border ${riskScoreLoading ? 'bg-gray-50' : riskScore ? getSeverityBgColor(riskScore.severity) : 'bg-gray-50'}`}>
                {riskScoreLoading ? (
                  <div className="text-xs text-gray-400">Risk score loading...</div>
                ) : riskScoreError && (riskScoreError as any)?.response?.status !== 404 ? (
                  <div className="text-xs text-red-500">Error loading risk score</div>
                ) : riskScore ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Risk Score</span>
                      <span className={`badge badge-sm ${getSeverityColor(riskScore.severity)}`}>
                        {riskScore.riskScore} - {riskScore.severity}
                      </span>
                    </div>
                    {riskScore.topFactors.length > 0 && (
                      <div className="text-xs text-gray-600 mt-2">
                        <div className="font-medium mb-1">Key Factors:</div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {riskScore.topFactors.map((factor, idx) => (
                            <li key={idx}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {breakdownLoading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : breakdown && breakdown.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-gray-700">
                  Project Allocations ({dateFrom} to {dateTo})
                </h3>
                {breakdown.map((item) => (
                  <div
                    key={item.projectId}
                    className="border rounded p-3 hover:bg-gray-50"
                  >
                    <div className="font-medium text-sm">{item.projectName}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {item.totalAllocatedHours.toFixed(1)} hours ({item.percentageOfResourceTime}% of capacity)
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No allocations found for this date range.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for resource allocation heatmap
function ResourceAllocationHeatmap({ resourceId }: { resourceId: string }) {
  const { data: allocs } = useResourceAllocations(resourceId, 8);
  return allocs ? <ResourceHeatmap data={allocs} /> : <span className="text-gray-400">…</span>;
}
