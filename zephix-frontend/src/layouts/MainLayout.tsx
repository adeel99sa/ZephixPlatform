import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  FolderIcon, 
  UsersIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon,
  BrainIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../utils';
// import { toast } from 'sonner';
import { FeedbackWidget } from '../components/feedback/FeedbackWidget';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'Document Intelligence', href: '/intelligence', icon: BrainIcon },
  { name: 'Team', href: '/team', icon: UsersIcon },
];

interface MainLayoutProps {
  // Add props here if needed in the future
}

export const MainLayout: React.FC<MainLayoutProps> = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 glass border-r border-gray-700/50">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center justify-center border-b border-gray-700/50 px-6">
            <div className="flex flex-col items-center space-y-2">
              {/* Logo with animated sparkle */}
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <SparklesIcon className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                {/* Animated sparkle ring */}
                <div className="absolute inset-0 w-10 h-10 rounded-xl border-2 border-indigo-400/30 animate-pulse"></div>
                {/* Pulsing shadow */}
                <div className="absolute inset-0 w-10 h-10 rounded-xl bg-indigo-500/20 animate-ping"></div>
              </div>
              
              {/* Brand name */}
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Zephix
              </h1>
              
              {/* AI Co-pilot badge */}
              <div className="bg-indigo-700/30 text-indigo-200 rounded-full px-3 py-0.5 font-semibold text-xs border border-indigo-600/30">
                AI Co-pilot
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-4 py-6" role="navigation" aria-label="Main navigation">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  )
                }
                aria-label={`Navigate to ${item.name}`}
              >
                <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* User menu */}
          <div className="border-t border-gray-700/50 p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-3 rounded-lg p-2 text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all duration-200"
                title="Logout"
                aria-label="Sign out of your account"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="py-8" role="main">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Feedback Widget */}
      <FeedbackWidget />
    </div>
  );
}; 