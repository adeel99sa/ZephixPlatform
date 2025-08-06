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
    <header className="glass border-b border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            {/* Sidebar Toggle Button */}
            <button
              onClick={toggle}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
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
            <h1 className="text-xl font-bold text-gradient">Zephix AI</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onCreateProject}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
              aria-label="Create new project"
            >
              <PlusIcon className="w-4 h-4 mr-2" aria-hidden="true" />
              Create Project
            </button>
            <button 
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              aria-label="User profile"
            >
              <UserCircleIcon className="w-6 h-6" aria-hidden="true" />
              <span className="hidden sm:block">{user?.firstName} {user?.lastName}</span>
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-300 transition-colors"
              title="Logout"
              aria-label="Sign out of your account"
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
