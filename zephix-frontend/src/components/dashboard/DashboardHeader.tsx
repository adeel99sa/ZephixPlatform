import React, { memo } from 'react';
import {
  ChatBubbleLeftRightIcon,
  PlusIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '../../hooks/useUser';
import { useSidebar } from '../../hooks/useSidebar';

interface DashboardHeaderProps {
  onCreateProject: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = memo(({
  onCreateProject,
}) => {
  const { user, logout } = useUser();
  const { isOpen, toggle } = useSidebar();

  const handleLogout = async () => {
    const result = await logout();
    if (!result.success && result.error) {
      console.error('Logout failed:', result.error.message);
    }
  };

  return (
    <header className="glass border-b border-gray-700/50" data-testid="dashboard-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            {/* Sidebar Toggle Button */}
            <button
              onClick={toggle}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
              aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
              data-testid="sidebar-toggle"
            >
              {isOpen ? (
                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Bars3Icon className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
            
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gradient">Zephix AI</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onCreateProject}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-all duration-200"
              aria-label="Create new project"
              data-testid="create-new-project-btn"
            >
              <PlusIcon className="w-4 h-4 mr-2" aria-hidden="true" />
              Create Project
            </button>
            <button 
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
              aria-label="User profile"
              data-testid="user-profile-btn"
            >
              <UserCircleIcon className="w-6 h-6" aria-hidden="true" />
              <span className="hidden sm:block">{user?.firstName} {user?.lastName}</span>
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
              title="Logout"
              aria-label="Sign out of your account"
              data-testid="logout-btn"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
});

DashboardHeader.displayName = 'DashboardHeader';
