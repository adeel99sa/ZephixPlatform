import React from 'react';
import { useAuth } from '@/state/AuthContext';

export const HomeView: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="p-6" data-testid="home-view">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.firstName || 'User'}!
        </h1>
        <p className="text-gray-600 mb-8">
          Here's what's happening in your workspace today.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h3>
            <p className="text-gray-600 text-sm">
              Create new projects, dashboards, or invite team members.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Activity</h3>
            <p className="text-gray-600 text-sm">
              See what's been happening in your workspace.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Getting Started</h3>
            <p className="text-gray-600 text-sm">
              Learn how to make the most of Zephix.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
