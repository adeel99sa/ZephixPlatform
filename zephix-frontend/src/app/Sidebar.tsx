import { NavLink } from 'react-router-dom';
import WorkspaceSwitcher from './WorkspaceSwitcher';

const items = [
  { to: '/hub', label: 'Hub', icon: 'i-lucide-home' },
  { to: '/dashboard', label: 'Dashboard', icon: 'i-lucide-activity' },
  { to: '/projects', label: 'Projects', icon: 'i-lucide-folders' },
  { to: '/tasks', label: 'Tasks', icon: 'i-lucide-check-square' },
  { to: '/resources', label: 'Resources', icon: 'i-lucide-users' },
  { to: '/risks', label: 'Risks', icon: 'i-lucide-alert-triangle' },
  { to: '/reports', label: 'Reports', icon: 'i-lucide-bar-chart-3' },
  { to: '/templates', label: 'Templates', icon: 'i-lucide-layers' },
  { to: '/analytics', label: 'Analytics', icon: 'i-lucide-line-chart' },
];

const bottom = [
  { to: '/notifications', label: 'Notifications', icon: 'i-lucide-bell' },
  { to: '/settings', label: 'Settings', icon: 'i-lucide-settings' },
  { to: '/admin/organization', label: 'Administration', icon: 'i-lucide-shield' },
  { to: '/help', label: 'Help', icon: 'i-lucide-life-buoy' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r h-screen flex flex-col">
      <div className="p-3">
        <WorkspaceSwitcher />
      </div>
      <nav className="px-2 space-y-1">
        {items.map(i => (
          <NavLink key={i.to} to={i.to}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100 ${
                isActive ? 'bg-gray-100 font-medium' : 'text-gray-700'
              }`}>
            <span className={i.icon} />
            {i.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-2 pb-3">
        {bottom.map(i => (
          <NavLink key={i.to} to={i.to}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100 ${
                isActive ? 'bg-gray-100 font-medium' : 'text-gray-700'
              }`}>
            <span className={i.icon} />
            {i.label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
