import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FolderIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

export const ViewerSidebarItems = () => {
  const location = useLocation();
  
  const viewerItems = [
    { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
    { name: 'Projects', href: '/projects', icon: FolderIcon, badge: 'View Only' },
    { name: 'Teams', href: '/teams', icon: UsersIcon, badge: 'View Only' },
    { name: 'My Work', href: '/my-work', icon: DocumentTextIcon },
  ];
  
  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      <div className="px-2 py-2 mb-2 text-sm text-yellow-600 bg-yellow-50 rounded">
        You have view-only access
      </div>
      {viewerItems.map((item) => (
        <Link
          key={item.name}
          to={item.href}
          className={`group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md ${
            location.pathname === item.href
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center">
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </div>
          {item.badge && (
            <span className="text-xs text-gray-500">{item.badge}</span>
          )}
        </Link>
      ))}
    </nav>
  );
};

