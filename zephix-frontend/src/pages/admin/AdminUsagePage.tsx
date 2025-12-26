import { useState, useEffect } from 'react';
import { Users, FolderKanban, HardDrive, AlertCircle, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { billingApi, Usage } from '@/services/billingApi';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';

interface UsageLimits {
  users: { used: number; allowed: number | null; percentage: number };
  projects: { used: number; allowed: number | null; percentage: number };
  workspaces: { used: number; allowed: number | null; percentage: number };
  storage: { used: number; allowed: number | null; percentage: number };
}

export default function AdminUsagePage() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      const usageData = await billingApi.getUsage();
      setUsage(usageData);

      // Calculate limits and percentages
      const calculatedLimits: UsageLimits = {
        users: {
          used: usageData.users.used,
          allowed: usageData.users.allowed,
          percentage: usageData.users.allowed ? Math.round((usageData.users.used / usageData.users.allowed) * 100) : 0,
        },
        projects: {
          used: usageData.projects.used,
          allowed: usageData.projects.allowed,
          percentage: usageData.projects.allowed ? Math.round((usageData.projects.used / usageData.projects.allowed) * 100) : 0,
        },
        workspaces: {
          used: usageData.workspaces?.used || 0,
          allowed: usageData.workspaces?.allowed || null,
          percentage: usageData.workspaces?.allowed ? Math.round(((usageData.workspaces.used || 0) / usageData.workspaces.allowed) * 100) : 0,
        },
        storage: {
          used: usageData.storage.used || 0,
          allowed: usageData.storage.allowed,
          percentage: usageData.storage.allowed ? Math.round(((usageData.storage.used || 0) / usageData.storage.allowed) * 100) : 0,
        },
      };
      setLimits(calculatedLimits);
    } catch (error) {
      console.error('Failed to load usage data:', error);
      toast.error('Failed to load usage information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <XCircle className="h-5 w-5 text-red-500" />;
    if (percentage >= 75) return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usage & Limits</h1>
          <p className="text-gray-500 mt-1">Monitor your organization's resource usage</p>
        </div>
        <div className="text-gray-500">Loading usage information...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Usage & Limits</h1>
        <p className="text-gray-500 mt-1">Monitor your organization's resource usage and plan limits</p>
      </div>

      {/* Usage Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {limits?.users.used || 0} / {limits?.users.allowed === null ? '∞' : limits?.users.allowed || 0}
                </p>
              </div>
            </div>
            {getStatusIcon(limits?.users.percentage || 0)}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getStatusColor(limits?.users.percentage || 0)}`}
              style={{ width: `${Math.min(limits?.users.percentage || 0, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{limits?.users.percentage || 0}% of limit used</p>
        </div>

        {/* Projects */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FolderKanban className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Projects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {limits?.projects.used || 0} / {limits?.projects.allowed === null ? '∞' : limits?.projects.allowed || 0}
                </p>
              </div>
            </div>
            {getStatusIcon(limits?.projects.percentage || 0)}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getStatusColor(limits?.projects.percentage || 0)}`}
              style={{ width: `${Math.min(limits?.projects.percentage || 0, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{limits?.projects.percentage || 0}% of limit used</p>
        </div>

        {/* Workspaces */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FolderKanban className="h-8 w-8 text-indigo-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Workspaces</p>
                <p className="text-2xl font-bold text-gray-900">
                  {limits?.workspaces.used || 0} / {limits?.workspaces.allowed === null ? '∞' : limits?.workspaces.allowed || 0}
                </p>
              </div>
            </div>
            {getStatusIcon(limits?.workspaces.percentage || 0)}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getStatusColor(limits?.workspaces.percentage || 0)}`}
              style={{ width: `${Math.min(limits?.workspaces.percentage || 0, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{limits?.workspaces.percentage || 0}% of limit used</p>
        </div>

        {/* Storage */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <HardDrive className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Storage</p>
                <p className="text-2xl font-bold text-gray-900">
                  {limits?.storage.used ? `${(limits.storage.used / 1024).toFixed(1)}GB` : '0GB'} / {limits?.storage.allowed === null ? '∞' : limits?.storage.allowed ? `${(limits.storage.allowed / 1024).toFixed(0)}GB` : '0GB'}
                </p>
              </div>
            </div>
            {getStatusIcon(limits?.storage.percentage || 0)}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getStatusColor(limits?.storage.percentage || 0)}`}
              style={{ width: `${Math.min(limits?.storage.percentage || 0, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{limits?.storage.percentage || 0}% of limit used</p>
        </div>
      </div>

      {/* Detailed Usage Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Usage Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Limit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">Active Users</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{limits?.users.used || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{limits?.users.allowed === null ? 'Unlimited' : limits?.users.allowed || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusIcon(limits?.users.percentage || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {limits && limits.users.percentage >= 90 && (
                    <a href="/admin/billing" className="text-indigo-600 hover:text-indigo-900">Upgrade Plan</a>
                  )}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FolderKanban className="h-5 w-5 text-purple-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">Projects</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{limits?.projects.used || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{limits?.projects.allowed === null ? 'Unlimited' : limits?.projects.allowed || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusIcon(limits?.projects.percentage || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {limits && limits.projects.percentage >= 90 && (
                    <a href="/admin/billing" className="text-indigo-600 hover:text-indigo-900">Upgrade Plan</a>
                  )}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FolderKanban className="h-5 w-5 text-indigo-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">Workspaces</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{limits?.workspaces.used || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{limits?.workspaces.allowed === null ? 'Unlimited' : limits?.workspaces.allowed || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusIcon(limits?.workspaces.percentage || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {limits && limits.workspaces.percentage >= 90 && (
                    <a href="/admin/billing" className="text-indigo-600 hover:text-indigo-900">Upgrade Plan</a>
                  )}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <HardDrive className="h-5 w-5 text-yellow-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">Storage</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {limits?.storage.used ? `${(limits.storage.used / 1024).toFixed(2)} GB` : '0 GB'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {limits?.storage.allowed === null ? 'Unlimited' : limits?.storage.allowed ? `${(limits.storage.allowed / 1024).toFixed(0)} GB` : '0 GB'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusIcon(limits?.storage.percentage || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {limits && limits.storage.percentage >= 90 && (
                    <a href="/admin/billing" className="text-indigo-600 hover:text-indigo-900">Upgrade Plan</a>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Trends */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Usage Trends</h2>
          <button
            onClick={loadUsageData}
            className="text-sm text-indigo-600 hover:text-indigo-900"
          >
            Refresh
          </button>
        </div>
        <div className="text-center py-8 text-gray-500">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Usage trend charts will be available soon</p>
          <p className="text-sm mt-2">Track your resource consumption over time</p>
        </div>
      </div>
    </div>
  );
}


