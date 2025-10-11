import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

export const NavigationSection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isMember } = useAuth();

  const navItems = [
    { icon: '📁', label: 'Projects', path: '/projects', roles: ['admin', 'member', 'viewer'] },
    { icon: '✅', label: 'My Work', path: '/my-work', roles: ['admin', 'member', 'viewer'] },
    { icon: '👥', label: 'Teams', path: '/teams', roles: ['admin', 'member'] },
    { icon: '🧑‍💼', label: 'Resources', path: '/resources', roles: ['admin', 'member'] },
    { icon: '📋', label: 'Templates', path: '/templates', roles: ['admin'] },
    { icon: '📄', label: 'Documents', path: '/documents', roles: ['admin', 'member'], badge: 'Coming Soon' },
  ];

  const canSee = (roles: string[]) => {
    if (isAdmin) return roles.includes('admin');
    if (isMember) return roles.includes('member');
    return roles.includes('viewer');
  };

  return (
    <div className="space-y-1">
      {navItems.map(item => {
        if (!canSee(item.roles)) return null;

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            disabled={item.badge === 'Coming Soon'}
            className={`
              w-full flex items-center px-3 py-2 rounded-md text-sm font-medium
              ${location.pathname === item.path
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
              }
              ${item.badge === 'Coming Soon' ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <span className="mr-3">{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

