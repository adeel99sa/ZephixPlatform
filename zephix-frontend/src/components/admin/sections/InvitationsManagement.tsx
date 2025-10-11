import React from 'react';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

export const InvitationsManagement: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <EnvelopeIcon className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invitations</h1>
          <p className="text-gray-600">Manage pending invitations</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <EnvelopeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Invitations Coming Soon</h3>
        <p className="text-gray-600">
          This section will show pending invitations and allow you to resend or cancel them.
        </p>
      </div>
    </div>
  );
};













