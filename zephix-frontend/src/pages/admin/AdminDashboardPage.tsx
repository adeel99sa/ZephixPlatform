import { useEffect, useState } from 'react';
import { adminApi } from '@/services/adminApi';
import {
  Users, FileText, FolderKanban, TrendingUp,
  Activity, AlertCircle, CheckCircle2, Clock, ArrowUp, ArrowDown,
  RefreshCw, Calendar, Zap
} from 'lucide-react';

interface Stats {
  userCount: number;
  activeUsers: number;
  templateCount: number;
  projectCount: number;
  totalItems?: number;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  database: string;
  services?: Record<string, string>;
}

interface ActivityItem {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: 'user' | 'project' | 'template' | 'system';
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadDashboardData(true);
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [statsData, healthData, auditData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getSystemHealth(),
        adminApi.getAuditLogs({ limit: 10 }).catch(() => ({ data: [] }))
      ]);
      setStats(statsData);
      setHealth(healthData);
      setActivities(auditData.data?.slice(0, 10) || []);
      setLastRefresh(new Date());
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Failed to load dashboard data');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      user: Users,
      project: FolderKanban,
      template: FileText,
      system: Zap,
    };
    return icons[type] || Activity;
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      user: 'bg-blue-100 text-blue-600',
      project: 'bg-green-100 text-green-600',
      template: 'bg-purple-100 text-purple-600',
      system: 'bg-yellow-100 text-yellow-600',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    subtitle,
    change
  }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: string;
    subtitle?: string;
    change?: number;
  }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex items-center gap-2">
          {change !== undefined && change !== 0 && (
            <div className={`flex items-center gap-1 text-sm ${
              change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              {Math.abs(change)}%
            </div>
          )}
          {trend && (
            <span className="text-sm text-green-600 font-medium">{trend}</span>
          )}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your organization and system health</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
          </div>
          <button
            onClick={() => loadDashboardData()}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Auto-refresh
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* System Health */}
      {health && (
        <div className={`rounded-lg border p-4 ${
          health.status === 'healthy'
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {health.status === 'healthy' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                System Status: <span className="capitalize">{health.status}</span>
              </p>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                <span>Database: {health.database}</span>
                {health.services && (
                  <span>Services: {Object.values(health.services).filter(s => s === 'operational').length} / {Object.keys(health.services).length} operational</span>
                )}
                <span>Last checked: {new Date(health.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats?.userCount || 0}
          icon={Users}
          subtitle={`${stats?.activeUsers || 0} active`}
          change={stats?.userCount ? Math.round((stats.activeUsers / stats.userCount) * 100) : 0}
        />
        <StatCard
          title="Templates"
          value={stats?.templateCount || 0}
          icon={FileText}
        />
        <StatCard
          title="Projects"
          value={stats?.projectCount || 0}
          icon={FolderKanban}
        />
        <StatCard
          title="Total Items"
          value={stats?.totalItems || 0}
          icon={TrendingUp}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/admin/users"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Manage Users</p>
                <p className="text-sm text-gray-500">Add, edit, or remove users</p>
              </div>
            </a>
            <a
              href="/admin/templates"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Templates</p>
                <p className="text-sm text-gray-500">Manage project templates</p>
              </div>
            </a>
            <a
              href="/admin/invite"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Invite Users</p>
                <p className="text-sm text-gray-500">Send invitations to new users</p>
              </div>
            </a>
            <a
              href="/admin/roles"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Roles & Permissions</p>
                <p className="text-sm text-gray-500">Manage user roles</p>
              </div>
            </a>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <a href="/admin/governance/audit" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </a>
          </div>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              activities.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{activity.action}</p>
                      <p className="text-xs text-gray-500">
                        {activity.user} • {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
