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
    // STEP 1: Only load data if workspace is selected
    // HomeView already guards for null workspace, but double-check here
    if (!activeWorkspaceId) {
      return;
    }
    loadHomeData();
  }, [activeWorkspaceId]);

  async function loadHomeData() {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<{ data: GuestHomeData }>('/home');
      // Backend returns { data: GuestHomeData }
      setData(response.data?.data ?? (response.data as unknown as GuestHomeData));
    } catch (error: any) {
      console.error('Failed to load guest home data:', error);
      // STEP 5: Don't show toast errors - silent failure, show empty state instead
      setError('Unable to load data');
    } finally {
      setLoading(false);
    }
  }

  // STEP 1: This should never render - HomeView guards for null workspace
  // But keep as safety check
  if (!activeWorkspaceId) {
    return null;
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

  // STEP 5: Replace error with empty state - no "Failed to load" messages
  if (error || !data) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div>
            <p className="text-gray-900 font-medium mb-2">Unable to load home data</p>
            <p className="text-sm text-gray-600 mb-4">Please try again later</p>
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
