import React from 'react';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

export const ResourcePolicies: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <AdjustmentsHorizontalIcon className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resource Policies</h1>
          <p className="text-gray-600">Configure resource allocation thresholds</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <AdjustmentsHorizontalIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Resource Policies Coming Soon</h3>
        <p className="text-gray-600">
          Configure warning levels, critical thresholds, and approval requirements for resource allocation.
        </p>
      </div>
    </div>
  );
};













