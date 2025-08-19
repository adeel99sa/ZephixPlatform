import React, { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  FolderIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  ChevronRightIcon,
  Cog6ToothIcon,
  LightBulbIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { useAuthStore } from '../../stores/authStore';
import { OrganizationSwitcher } from '../ui/OrganizationSwitcher';
import { cn } from '../../utils';

interface GlobalHeaderProps {
  currentPage?: string;
  className?: string;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'AI Mapping', href: '/ai/mapping', icon: SparklesIcon },
  { name: 'AI Suggestions', href: '/ai/suggestions', icon: LightBulbIcon },
  { name: 'Collaboration', href: '/collaboration', icon: UsersIcon },
  { name: 'Workflows', href: '/workflows', icon: ClipboardDocumentListIcon },
  { name: 'Intake', href: '/intake', icon: DocumentTextIcon },
  { name: 'Templates', href: '/templates', icon: DocumentTextIcon },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon },
  { name: 'Team', href: '/team', icon: UsersIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({ 
  currentPage,
  className = ''
}) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleOrganizationSettings = () => {
    navigate('/organizations/settings');
  };

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    const breadcrumbMap: Record<string, string> = {
      'dashboard': 'Dashboard',
      'projects': 'Projects',
      'ai': 'AI',
      'mapping': 'Mapping',
      'suggestions': 'Suggestions',
      'collaboration': 'Collaboration',
      'workflows': 'Workflows',
      'intake': 'Intake Forms',
      'templates': 'Templates',
      'reports': 'Reports',
      'team': 'Team Management',
      'settings': 'Settings',
      'organizations': 'Organization',
      'brd': 'BRD',
      'upload': 'Upload',
      'status': 'Status',
      'builder': 'Builder',
      'edit': 'Edit',
      'ai-designer': 'AI Designer'
    };

    if (pathSegments.length === 0) return ['Dashboard'];
    
    return pathSegments.map(segment => 
      breadcrumbMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    );
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className={cn(
      "bg-slate-900 border-b border-slate-700 px-4 sm:px-6 py-4 sticky top-0 z-40",
      className
    )}>
      <div className="flex items-center justify-between">
        {/* Left: Logo + Breadcrumbs */}
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2 shrink-0">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="text-white font-semibold text-lg hidden sm:block">Zephix AI</span>
          </Link>
          
          {/* Breadcrumbs */}
          <nav className="hidden md:flex items-center space-x-2 text-sm text-slate-400">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRightIcon className="w-4 h-4" />}
                <span className={index === breadcrumbs.length - 1 ? "text-white" : "text-slate-400"}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Center: Quick Navigation (Desktop) */}
        <nav className="hidden lg:flex items-center space-x-6">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                )
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Right: Organization Switcher + User Menu */}
        <div className="flex items-center space-x-4">
          {/* Organization Switcher (Desktop) */}
          <div className="hidden sm:block">
            <OrganizationSwitcher 
              className="max-w-[200px]"
              onOrganizationSettings={handleOrganizationSettings}
            />
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            {/* Settings Button */}
            <button
              onClick={handleOrganizationSettings}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
              title="Settings"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>

            {/* User Info + Logout */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden mt-4 pt-4 border-t border-slate-700">
          <div className="space-y-3">
            {/* Mobile Organization Switcher */}
            <div className="sm:hidden">
              <OrganizationSwitcher 
                onOrganizationSettings={handleOrganizationSettings}
              />
            </div>

            {/* Mobile Navigation */}
            <nav className="space-y-2">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    )
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>

            {/* Mobile User Info */}
            <div className="sm:hidden pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
