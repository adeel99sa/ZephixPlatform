import React from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';

export const TeamsManagement: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <UserGroupIcon className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams Management</h1>
          <p className="text-gray-600">Create and manage teams</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Teams Management Coming Soon</h3>
        <p className="text-gray-600">
          This section will include team creation, member management, and team permissions.
        </p>
      </div>
    </div>
  );
};













