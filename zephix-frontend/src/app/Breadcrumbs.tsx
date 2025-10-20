import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

const routeMap: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
  '/resources': 'Resources',
  '/risks': 'Risks',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  
  // Don't show breadcrumbs on dashboard
  if (location.pathname === '/app/dashboard') {
    return null;
  }

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const name = routeMap[path] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    return {
      name,
      path,
      current: index === pathSegments.length - 1,
    };
  });

  return (
    <nav className="flex md:pl-64 bg-white border-b border-gray-200" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-4 px-4 py-3">
        <li>
          <div>
            <Link to="/app/dashboard" className="text-gray-400 hover:text-gray-500">
              <HomeIcon className="flex-shrink-0 h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Home</span>
            </Link>
          </div>
        </li>
        {breadcrumbs.map((breadcrumb) => (
          <li key={breadcrumb.path}>
            <div className="flex items-center">
              <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" aria-hidden="true" />
              {breadcrumb.current ? (
                <span className="ml-4 text-sm font-medium text-gray-500" aria-current="page">
                  {breadcrumb.name}
                </span>
              ) : (
                <Link
                  to={breadcrumb.path}
                  className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  {breadcrumb.name}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};
