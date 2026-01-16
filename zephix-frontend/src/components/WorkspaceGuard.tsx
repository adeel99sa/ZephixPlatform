/**
 * WorkspaceGuard - Prevents rendering workspace-scoped content without workspace selection
 * Shows clear message instead of allowing failed requests
 */
import React from 'react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useNavigate } from 'react-router-dom';

interface WorkspaceGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function WorkspaceGuard({ children, fallback }: WorkspaceGuardProps) {
  const { activeWorkspaceId } = useWorkspaceStore();
  const navigate = useNavigate();

  if (!activeWorkspaceId) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto mt-8">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Workspace Required
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Please select a workspace to continue. Projects and work management
                require a workspace context.
              </p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => navigate('/workspaces')}
                className="bg-yellow-100 px-3 py-2 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Go to Workspaces
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
