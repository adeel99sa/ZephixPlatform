import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

interface MemberHomeData {
  myWork: {
    assignedWorkItemsDueSoonCount: number;
    myActiveProjectsCount: number;
    risksIOwnCount: number;
    upcomingMilestonesCount: number;
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

export function MemberHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<MemberHomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  async function loadHomeData() {
    try {
      setLoading(true);
      const response = await api.get<{ data: MemberHomeData }>('/home');
      setData(response.data);
    } catch (error) {
      console.error('Failed to load member home data:', error);
    } finally {
      setLoading(false);
    }
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

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Failed to load home data</p>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="member-home">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName || 'User'}!
          </h1>
          <p className="text-gray-600">Your work and team signals</p>
        </div>

        {/* My Work Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Work Items Due Soon</h3>
            <p className="text-3xl font-bold text-gray-900">{data.myWork.assignedWorkItemsDueSoonCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">My Active Projects</h3>
            <p className="text-3xl font-bold text-gray-900">{data.myWork.myActiveProjectsCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Risks I Own</h3>
            <p className="text-3xl font-bold text-gray-900">{data.myWork.risksIOwnCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Upcoming Milestones</h3>
            <p className="text-3xl font-bold text-gray-900">{data.myWork.upcomingMilestonesCount}</p>
          </div>
        </div>

        {/* Team Signals */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Signals</h2>
          <p className="text-sm text-gray-600">
            Upcoming milestones and overdue items will appear here.
          </p>
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
