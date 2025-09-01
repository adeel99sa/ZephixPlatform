import { NavLink } from 'react-router-dom';
import { FolderIcon, UsersIcon, ChartBarIcon, CogIcon } from '@heroicons/react/24/outline';

interface SidebarProps {
  permissions: {
    canViewProjects: boolean;
    canManageResources: boolean;
    canViewAnalytics: boolean;
    isAdmin: boolean;
  };
}

export function Sidebar({ permissions }: SidebarProps) {
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon, show: true },
    { name: 'Projects', href: '/projects', icon: FolderIcon, show: permissions.canViewProjects },
    { name: 'Resources', href: '/resources', icon: UsersIcon, show: permissions.canManageResources },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, show: permissions.canViewAnalytics },
    { name: 'Settings', href: '/settings', icon: CogIcon, show: permissions.isAdmin },
  ];

  return (
    <nav className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800">Zephix</h2>
      </div>
      <ul className="space-y-2 p-4">
        {navigation.filter(item => item.show).map((item) => (
          <li key={item.name}>
            <NavLink
              to={item.href}
              className={({ isActive }) =>
                `flex items-center px-4 py-2 rounded-md ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

