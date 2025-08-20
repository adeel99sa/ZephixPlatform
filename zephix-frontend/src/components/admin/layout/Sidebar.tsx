import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  FileText, 
  CheckSquare, 
  BarChart3 
} from 'lucide-react';

const sidebarItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/users', label: 'Users & Roles', icon: Users },
  { 
    path: '/admin/security', 
    label: 'Security', 
    icon: Shield,
    children: [
      { path: '/admin/security', label: 'Overview' },
      { path: '/admin/security/policies', label: 'Policies' },
      { path: '/admin/security/sessions', label: 'Sessions' },
      { path: '/admin/security/audit', label: 'Audit' },
    ]
  },
  { path: '/admin/templates', label: 'Templates', icon: FileText },
  { 
    path: '/admin/governance', 
    label: 'Governance', 
    icon: CheckSquare,
    children: [
      { path: '/admin/governance', label: 'Overview' },
      { path: '/admin/governance/approvals', label: 'Approvals' },
      { path: '/admin/governance/rules', label: 'Rules' },
    ]
  },
  { path: '/admin/usage', label: 'Usage', icon: BarChart3 }
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-60 bg-neutral-200 min-h-screen">
      <nav className="mt-6">
        {sidebarItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-primary bg-white border-r-4 border-primary font-semibold'
                  : 'text-gray-700 hover:text-primary hover:bg-gray-100'
              }`
            }
          >
            <item.icon className="w-4 h-4 mr-3" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
