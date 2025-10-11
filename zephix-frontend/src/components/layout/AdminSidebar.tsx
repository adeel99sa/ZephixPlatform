import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  CogIcon,
  FolderIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ChartPieIcon,
  DocumentDuplicateIcon,
  BuildingOfficeIcon,
  UserIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

export const AdminSidebarItems = () => {
  const location = useLocation();
  
  // Regular workspace navigation
  const workspaceItems = [
    { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
    { name: 'Projects', href: '/projects', icon: FolderIcon },
    { name: 'Teams', href: '/teams', icon: UserGroupIcon },
    { name: 'My Work', href: '/my-work', icon: DocumentTextIcon },
    { name: 'Templates', href: '/templates', icon: DocumentDuplicateIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartPieIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
  ];

  // Admin-only functions
  const adminItems = [
    { name: 'User Management', href: '/admin/users', icon: UserIcon },
    { name: 'All Workspaces', href: '/admin/workspaces', icon: BuildingOfficeIcon },
    { name: 'Organization Analytics', href: '/admin/analytics', icon: ChartPieIcon },
    { name: 'Admin Settings', href: '/admin/settings', icon: ShieldCheckIcon },
  ];
  
  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {/* Regular Navigation */}
      {workspaceItems.map((item) => (
        <Link
          key={item.name}
          to={item.href}
          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
            location.pathname === item.href
              ? 'bg-blue-100 text-blue-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <item.icon className="mr-3 h-5 w-5" />
          {item.name}
        </Link>
      ))}
      
      {/* Admin-Only Section */}
      <div className="border-t border-gray-200 my-4"></div>
      <div className="px-2 py-1">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Administration
        </h3>
      </div>
      {adminItems.map((item) => (
        <Link
          key={item.name}
          to={item.href}
          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
            location.pathname === item.href
              ? 'bg-red-100 text-red-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <item.icon className="mr-3 h-5 w-5" />
          {item.name}
        </Link>
      ))}
    </nav>
  );
};
