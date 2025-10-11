import React from 'react';
import { CogIcon } from '@heroicons/react/24/outline';

export const GeneralSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <CogIcon className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">General Settings</h1>
          <p className="text-gray-600">Configure organization settings</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <CogIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">General Settings Coming Soon</h3>
        <p className="text-gray-600">
          Configure organization name, timezone, default settings, and preferences.
        </p>
      </div>
    </div>
  );
};













