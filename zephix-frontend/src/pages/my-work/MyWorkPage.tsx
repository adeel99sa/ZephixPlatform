/**
 * PHASE 7 MODULE 7.2: My Work Page
 * Shows assigned work items across all accessible workspaces for Admin and Member
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

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

type FilterType = 'all' | 'overdue' | 'dueSoon' | 'inProgress' | 'todo' | 'done';

export default function MyWorkPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<MyWorkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadMyWork();
  }, []);

  async function loadMyWork() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<MyWorkResponse>('/my-work');
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
  }

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

  function filterItems(items: MyWorkItem[]): MyWorkItem[] {
    switch (activeFilter) {
      case 'overdue':
        return items.filter(isOverdue);
      case 'dueSoon':
        return items.filter(isDueSoon);
      case 'inProgress':
        return items.filter((item) => item.status === 'in_progress');
      case 'todo':
        return items.filter((item) => item.status === 'todo');
      case 'done':
        return items.filter((item) => item.status === 'done');
      default:
        return items;
    }
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
        {(['all', 'overdue', 'dueSoon', 'inProgress', 'todo', 'done'] as FilterType[]).map((filter) => {
          const label = filter === 'all' ? 'All' :
                       filter === 'dueSoon' ? 'Due soon' :
                       filter === 'inProgress' ? 'In progress' :
                       filter.charAt(0).toUpperCase() + filter.slice(1);

          const count = filter === 'all' ? data.counts.total :
                       filter === 'overdue' ? data.counts.overdue :
                       filter === 'dueSoon' ? data.counts.dueSoon7Days :
                       filter === 'inProgress' ? data.counts.inProgress :
                       filter === 'todo' ? data.counts.todo :
                       data.counts.done;

          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeFilter === filter
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
            {activeFilter !== 'all'
              ? `No tasks match the "${activeFilter}" filter`
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
