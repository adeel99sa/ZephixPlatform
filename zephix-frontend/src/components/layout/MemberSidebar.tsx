import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FolderIcon,
  ClipboardIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

export const MemberSidebarItems = () => {
  const location = useLocation();
  
  const memberItems = [
    { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
    { name: 'Projects', href: '/projects', icon: FolderIcon },
    { name: 'Teams', href: '/teams', icon: UsersIcon },
    { name: 'My Work', href: '/my-work', icon: ClipboardIcon },
    { name: 'Templates', href: '/templates', icon: DocumentDuplicateIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
  ];
  
  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {memberItems.map((item) => (
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
    </nav>
  );
};

