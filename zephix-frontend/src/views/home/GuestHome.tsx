import React, { useEffect, useState } from 'react';
import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

interface GuestHomeData {
  readOnlySummary: {
    accessibleWorkspacesCount: number;
    accessibleProjectsCount: number;
  };
}

export function GuestHome() {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [data, setData] = useState<GuestHomeData | null>(null);
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
      const response = await api.get<{ data: GuestHomeData }>('/home');
      setData(response.data);
    } catch (error: any) {
      console.error('Failed to load guest home data:', error);
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
            <p className="text-gray-600">Select a workspace to view shared content</p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => window.location.href = '/workspaces'} className="px-6 py-3">
              Select Workspace
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
    <div className="p-6" data-testid="guest-home">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user?.firstName || 'Guest'}!
          </h1>
          <p className="text-gray-600">Read-only overview of shared workspaces and projects</p>
        </div>

        {/* Read-Only Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Shared Workspaces</h3>
            <p className="text-3xl font-bold text-gray-900">{data.readOnlySummary.accessibleWorkspacesCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Shared Projects</h3>
            <p className="text-3xl font-bold text-gray-900">{data.readOnlySummary.accessibleProjectsCount}</p>
          </div>
        </div>

        {/* Access Guidance */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Information</h2>
          <p className="text-sm text-gray-600 mb-4">
            You have view-only access to shared workspaces and projects. To request additional access or participate in work, contact a workspace owner.
          </p>
          <Link to="/workspaces">
            <Button variant="outline" className="px-4 py-2">
              View Workspaces
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
