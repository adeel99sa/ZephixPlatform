import React from 'react';
import { ProjectStats } from './ProjectStats';
import { QuickActions } from './QuickActions';
import { RecentProjects } from './RecentProjects';
import type { Project } from '../../types';

interface DashboardSidebarProps {
  isLoading?: boolean;
  onQuickAction?: (action: string) => void;
  onProjectClick?: (project: Project) => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  isLoading = false,
  onQuickAction,
  onProjectClick
}) => {
  if (isLoading) {
    return (
      <div className="w-80 bg-gray-800 border-l border-gray-700 p-6" role="complementary" aria-label="Dashboard sidebar">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-white mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-white mb-3">Project Overview</h3>
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-white mb-3">Recent Projects</h3>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 p-6" role="complementary" aria-label="Dashboard sidebar">
      <div className="space-y-4">
        <QuickActions onQuickAction={onQuickAction} />
        <ProjectStats />
        <RecentProjects onProjectClick={onProjectClick} />
      </div>
    </div>
  );
};
