/**
 * PHASE 7 MODULE 7.2: My Work Page
 * Shows assigned work items across all accessible workspaces for Admin and Member
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import {
  WorkItemFilters,
  WorkItemStatusFilter,
  parseWorkItemFilters,
  buildWorkItemSearch,
  hasAnyFilterKey,
  toMyWorkApiParams,
} from '@/features/work/items/workItemFilters';

type WorkItemStatus = 'todo' | 'in_progress' | 'done';

type MyWorkItem = {
  id: string;
  title: string;
  status: WorkItemStatus;
  dueDate?: string | null;
  updatedAt: string;
  projectId: string;
  projectName: string;
  workspaceId: string;
  workspaceName: string;
};

type MyWorkResponse = {
  version: number;
  counts: {
    total: number;
    overdue: number;
    dueSoon7Days: number;
    inProgress: number;
    todo: number;
    done: number;
  };
  items: MyWorkItem[];
};

function defaultFilters(seed: WorkItemFilters): WorkItemFilters {
  const workspaceScoped = !!seed.workspaceId;

  return {
    workspaceId: seed.workspaceId,
    status: seed.status ?? 'active',
    assignee: seed.assignee ?? (workspaceScoped ? 'any' : 'me'),
    dateRange: seed.dateRange ?? 'last_30_days',
    health: seed.health,
  };
}

export default function MyWorkPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const urlFilters = useMemo(() => parseWorkItemFilters(location.search), [location.search]);

  const [filters, setFilters] = useState<WorkItemFilters>(() => urlFilters);
  const [data, setData] = useState<MyWorkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFilters(urlFilters);
  }, [urlFilters]);

  // Apply defaults if URL has no filter keys
  useEffect(() => {
    if (hasAnyFilterKey(location.search)) return;

    const seeded = parseWorkItemFilters(location.search);
    const next = defaultFilters(seeded);
    const nextSearch = buildWorkItemSearch(next);

    navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const loadMyWork = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = toMyWorkApiParams(filters);
      const response = await api.get<MyWorkResponse>('/my-work', { params });
      setData(response.data);
    } catch (err: any) {
      console.error('Failed to load my work:', err);
      if (err?.response?.status === 403) {
        setError('Access denied. This page is for Admin and Member users only.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load your work items');
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadMyWork();
  }, [loadMyWork]);

  const setStatus = useCallback(
    (status: WorkItemStatusFilter) => {
      const next: WorkItemFilters = { ...filters, status };
      const nextSearch = buildWorkItemSearch(next);
      navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
    },
    [filters, location.pathname, navigate],
  );

  function getStatusColor(status: WorkItemStatus): string {
    switch (status) {
      case 'todo':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'done':
        return 'bg-green-100 text-green-800';
    }
  }

  function isOverdue(item: MyWorkItem): boolean {
    if (!item.dueDate) return false;
    const due = new Date(item.dueDate);
    const now = new Date();
    return due < now && item.status !== 'done';
  }

  function isDueSoon(item: MyWorkItem): boolean {
    if (!item.dueDate || item.status === 'done') return false;
    const due = new Date(item.dueDate);
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return due >= now && due <= sevenDaysFromNow;
  }

  // Client-side filtering as fallback until backend supports all filters
  function filterItems(items: MyWorkItem[]): MyWorkItem[] {
    let filtered = items;

    // Filter by workspace if specified
    if (filters.workspaceId) {
      filtered = filtered.filter((item) => item.workspaceId === filters.workspaceId);
    }

    // Filter by status (map new status values to old ones for now)
    if (filters.status) {
      switch (filters.status) {
        case 'active':
          filtered = filtered.filter((item) => item.status === 'todo' || item.status === 'in_progress');
          break;
        case 'completed':
          filtered = filtered.filter((item) => item.status === 'done');
          break;
        case 'at_risk':
          // Fallback: show overdue items
          filtered = filtered.filter(isOverdue);
          break;
        case 'blocked':
          // No direct mapping yet, show all for now
          break;
        case 'all':
        default:
          // Show all
          break;
      }
    }

    return filtered;
  }

  function handleRowClick(item: MyWorkItem) {
    // Navigate to project overview with taskId query param
    navigate(`/projects/${item.projectId}?taskId=${item.id}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={loadMyWork}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  const filteredItems = filterItems(data.items);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Work</h1>
        <p className="text-sm text-gray-600 mt-1">
          Your assigned tasks across all workspaces
        </p>
      </div>

      {/* Counts Summary */}
      {data.counts.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold text-gray-900">{data.counts.total}</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4">
            <div className="text-sm text-red-600">Overdue</div>
            <div className="text-2xl font-bold text-red-700">{data.counts.overdue}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <div className="text-sm text-yellow-600">Due Soon</div>
            <div className="text-2xl font-bold text-yellow-700">{data.counts.dueSoon7Days}</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4">
            <div className="text-sm text-blue-600">In Progress</div>
            <div className="text-2xl font-bold text-blue-700">{data.counts.inProgress}</div>
          </div>
          <div className="bg-gray-50 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Todo</div>
            <div className="text-2xl font-bold text-gray-700">{data.counts.todo}</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <div className="text-sm text-green-600">Done</div>
            <div className="text-2xl font-bold text-green-700">{data.counts.done}</div>
          </div>
        </div>
      )}

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'active', 'completed', 'at_risk', 'blocked'] as WorkItemStatusFilter[]).map((status) => {
          const label =
            status === 'all' ? 'All' :
            status === 'active' ? 'Active' :
            status === 'completed' ? 'Completed' :
            status === 'at_risk' ? 'At Risk' :
            status === 'blocked' ? 'Blocked' :
            status;

          // Map to old counts for now (until backend provides new counts)
          const count =
            status === 'all' ? data.counts.total :
            status === 'active' ? data.counts.todo + data.counts.inProgress :
            status === 'completed' ? data.counts.done :
            status === 'at_risk' ? data.counts.overdue :
            0;

          return (
            <button
              key={status}
              onClick={() => setStatus(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filters.status === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Task List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">No assigned work yet</p>
          <p className="text-sm text-gray-400 mt-2">
            {filters.status && filters.status !== 'all'
              ? `No tasks match the "${filters.status}" filter`
              : 'Tasks assigned to you will appear here'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workspace
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => {
                const overdue = isOverdue(item);
                return (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.title}</div>
                      {overdue && (
                        <div className="text-xs text-red-600 mt-1">⚠️ Overdue</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.dueDate ? (
                        <span className={overdue ? 'text-red-600 font-medium' : ''}>
                          {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.projectName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.workspaceName}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
