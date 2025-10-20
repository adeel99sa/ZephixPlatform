import React from 'react';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

export const TasksPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Tasks Management</h3>
        <p className="mt-1 text-sm text-gray-500">
          Task management features are coming soon. This will include personal and team task views.
        </p>
        <div className="mt-6">
          <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
};
