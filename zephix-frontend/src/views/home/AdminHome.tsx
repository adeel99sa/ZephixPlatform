import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface AdminHomeData {
  organizationSummary: {
    activeWorkspacesCount: number;
    activeProjectsCount: number;
    atRiskProjectsCount: number;
  };
  adminActions: {
    canCreateWorkspace: boolean;
    canManageWorkspaces: boolean;
  };
  inboxPreview: {
    unreadCount: number;
    topNotifications: Array<{
      id: string;
      title: string;
      body: string | null;
      createdAt: string;
    }>;
  };
}

export function AdminHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [data, setData] = useState<AdminHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // /home endpoint is org-scoped, works without workspace
    // But show empty state if no workspace selected for better UX
    loadHomeData();
  }, []);

  async function loadHomeData() {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<{ data: AdminHomeData }>('/home');
      setData(response.data);
    } catch (error: any) {
      console.error('Failed to load admin home data:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load home data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  // Empty state when no workspace selected
  if (!activeWorkspaceId) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Get Started</h1>
            <p className="text-gray-600">Select a workspace or create a project from a template</p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/workspaces')} className="px-6 py-3">
              Select Workspace
            </Button>
            <Button onClick={() => navigate('/templates')} variant="outline" className="px-6 py-3">
              Create Project
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div>
            <p className="text-gray-900 font-medium mb-2">Failed to load home data</p>
            {error && <p className="text-sm text-gray-600 mb-4">{error}</p>}
          </div>
          <Button onClick={loadHomeData} className="px-6 py-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="admin-home">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName || 'Admin'}!
          </h1>
          <p className="text-gray-600">Organization overview and quick actions</p>
        </div>

        {/* Organization Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Active Workspaces</h3>
            <p className="text-3xl font-bold text-gray-900">{data.organizationSummary.activeWorkspacesCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Active Projects</h3>
            <p className="text-3xl font-bold text-gray-900">{data.organizationSummary.activeProjectsCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Projects at Risk</h3>
            <p className="text-3xl font-bold text-red-600">{data.organizationSummary.atRiskProjectsCount}</p>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {data.adminActions.canCreateWorkspace && (
              <Button onClick={() => navigate('/workspaces')} className="px-4 py-2">
                Create Workspace
              </Button>
            )}
            {data.adminActions.canManageWorkspaces && (
              <Button onClick={() => navigate('/admin/workspaces')} variant="outline" className="px-4 py-2">
                Manage Workspaces
              </Button>
            )}
            <Button onClick={() => navigate('/admin/users')} variant="outline" className="px-4 py-2">
              Invite Users
            </Button>
            <Link to="/dashboards">
              <Button variant="outline" className="px-4 py-2">Dashboards</Button>
            </Link>
            <Link to="/templates">
              <Button variant="outline" className="px-4 py-2">Templates</Button>
            </Link>
            <Link to="/resources">
              <Button variant="outline" className="px-4 py-2">Resources</Button>
            </Link>
          </div>
        </div>

        {/* Inbox Preview */}
        {data.inboxPreview.unreadCount > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Inbox</h2>
              <Link to="/inbox">
                <Button variant="outline" size="sm">
                  View All ({data.inboxPreview.unreadCount})
                </Button>
              </Link>
            </div>
            {data.inboxPreview.topNotifications.length > 0 ? (
              <div className="space-y-2">
                {data.inboxPreview.topNotifications.map((notification) => (
                  <div key={notification.id} className="border-b border-gray-200 pb-2 last:border-0">
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    {notification.body && (
                      <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No unread notifications</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
