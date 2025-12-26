import { useState, useEffect } from 'react';
import { BarChart, Users, LayoutGrid, FolderKanban } from 'lucide-react';
import { adminOverviewApi } from '@/features/admin/overview/AdminOverview.api';

interface UsageStats {
  totalUsers: number;
  activeUsers: number;
  totalWorkspaces: number;
  activeProjects: number;
}

export default function UsageStatsPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Use existing admin summary endpoint
      const summary = await adminOverviewApi.getSummary();
      setStats({
        totalUsers: summary.users.total || 0,
        activeUsers: summary.users.total || 0, // TODO: Get active users count if available
        totalWorkspaces: summary.workspaces.total || 0,
        activeProjects: 0, // TODO: Add project count to summary endpoint
      });
    } catch (error) {
      console.error('Failed to load usage stats:', error);
      // Fallback to stub data
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        totalWorkspaces: 0,
        activeProjects: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Active Users',
      value: stats?.activeUsers ?? 0,
      icon: Users,
      color: 'green',
    },
    {
      label: 'Workspaces',
      value: stats?.totalWorkspaces ?? 0,
      icon: LayoutGrid,
      color: 'purple',
    },
    {
      label: 'Active Projects',
      value: stats?.activeProjects ?? 0,
      icon: FolderKanban,
      color: 'orange',
    },
  ];

  return (
    <div className="p-6" data-testid="admin-usage-root">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart className="h-6 w-6" />
          Usage Stats
        </h1>
        <p className="text-gray-600 mt-2">
          View organization-wide usage statistics and activity metrics.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading usage statistics...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            const colorClasses = {
              blue: 'bg-blue-50 text-blue-600',
              green: 'bg-green-50 text-green-600',
              purple: 'bg-purple-50 text-purple-600',
              orange: 'bg-orange-50 text-orange-600',
            };

            return (
              <div
                key={card.label}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-md ${colorClasses[card.color as keyof typeof colorClasses]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {card.value.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">{card.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {stats && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
          <p className="text-sm text-gray-500">
            <strong>Note:</strong> Project count may not be available in all environments.
            TODO: Add project count to admin summary endpoint if not already present.
          </p>
        </div>
      )}
    </div>
  );
}

