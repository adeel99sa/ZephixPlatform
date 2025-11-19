import React from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export const InvitePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" data-testid="invite-page">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">ZEPHIX</span>
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900" data-testid="invite-title">
          Accept Invitation
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          You've been invited to join a workspace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <p className="text-gray-500">Invitation acceptance functionality coming soon...</p>
            <Link 
              to="/login" 
              className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
