import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AdminRoutes } from './AdminRoutes';
import {
  BuildingOfficeIcon,
  UsersIcon,
  CogIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  DocumentDuplicateIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

export const AdminHub: React.FC = () => {
  const location = useLocation();

  const adminNavigation = [
    {
      section: '🏢 Organization',
      items: [
        { label: 'General Settings', path: '/admin/settings', icon: CogIcon },
        { label: 'Billing & Subscription', path: '/admin/billing', icon: CreditCardIcon },
        { label: 'Security', path: '/admin/security', icon: ShieldCheckIcon },
      ]
    },
    {
      section: '👥 People',
      items: [
        { label: 'User Management', path: '/admin/users', icon: UsersIcon },
        { label: 'Teams', path: '/admin/teams', icon: UsersIcon },
        { label: 'Roles & Permissions', path: '/admin/permissions', icon: ShieldCheckIcon },
      ]
    },
    {
      section: '🏛️ Governance',
      items: [
        { label: 'Resource Policy', path: '/admin/resource-policy', icon: CogIcon },
        { label: 'Project Templates', path: '/admin/templates', icon: DocumentDuplicateIcon },
        { label: 'Approval Workflows', path: '/admin/workflows', icon: CogIcon },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Workspace
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Admin Hub</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Admin Sidebar */}
        <div className="w-64 bg-gray-900 text-white">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-6">Administration</h2>
            <nav className="space-y-6">
              {adminNavigation.map((section) => (
                <div key={section.section}>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    {section.section}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          <Icon className="mr-3 h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Admin Content Area */}
        <div className="flex-1 p-6">
          <AdminRoutes />
        </div>
      </div>
    </div>
  );
};

