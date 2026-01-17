import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';
import { HomeEmptyState } from './home/HomeEmptyState';

export const HomeView: React.FC = () => {
  const { user, activeWorkspaceId } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // If activeWorkspaceId exists, redirect to workspace home
  useEffect(() => {
    if (activeWorkspaceId) {
      navigate(`/workspaces/${activeWorkspaceId}/home`, { replace: true });
    }
  }, [activeWorkspaceId, navigate]);

  // If no active workspace, show empty state
  return <HomeEmptyState />;
};
