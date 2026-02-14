import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Building2, Users, Shield, CreditCard, FileText,
  Brain, Link, Database, Scale, Bell, BarChart3,
  HeadphonesIcon, ChevronDown, Settings, LayoutDashboard, ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/state/AuthContext';
import { isPlatformAdmin } from '@/utils/access';

/**
 * ADMIN NAVIGATION ROUTE MAPPING
 *
 * This table maps all admin nav items to their routes in App.tsx
 *
 * | Label                    | pathInNav              | pathInRoutes            | Status      |
 * |--------------------------|------------------------|-------------------------|-------------|
 * | Dashboard                | /admin                 | /admin                  | ✅ Working  |
 * | Users & Teams            | /admin/users           | /admin/users            | ✅ Working  |
 * | Teams                    | /admin/teams           | /admin/teams            | ✅ Working  |
 * | Usage & Limits           | /admin/usage           | /admin/usage            | ✅ Working  |
 * | Billing & Plans          | /admin/billing         | /admin/billing          | ✅ Working  |
 * | Project Templates        | /admin/templates       | /admin/templates        | ✅ Working  |
 * | Template Builder         | /admin/templates/builder| /admin/templates/builder| ✅ Working  |
 * | Custom Fields            | /admin/templates/custom-fields | /admin/templates/custom-fields | ✅ Working |
 * | All Workspaces           | /admin/workspaces      | /admin/workspaces       | ✅ Working  |
 * | All Projects             | /admin/projects        | /admin/projects         | ✅ Working  |
 * | Trash                    | /admin/trash           | /admin/trash            | ✅ Working  |
 *
 * | Org Command Center       | /org-dashboard         | /org-dashboard          | ✅ Working  |
 *
 * Hidden/Deprecated Routes (not in nav but still exist):
 * - /admin/org → AdminOrganizationPage (stub, not in nav)
 * - /admin/roles → AdminRolesPage (stub, not in nav)
 * - /admin/invite → AdminInvitePage (replaced by drawer, not in nav)
 * - /admin/security → AdminSecurityPage (stub, not in nav)
 * - /admin/archive → AdminArchivePage (redirects to /admin/trash)
 * - /admin/overview → AdminOverviewPage (alternative dashboard)
 */

/**
 * Phase 2A: Admin IA grouping
 * Groups: Organization, Governance, Workspaces & Projects
 * Billing visible only when functional (route exists).
 * Stub pages (Security, Audit, Roles) hidden from nav.
 */
/**
 * Org Command Center nav item — gated by isPlatformAdmin.
 * Defined separately so it can be included conditionally.
 */
const orgCommandCenterItem = {
  id: 'org-command-center',
  label: 'Org Command Center',
  icon: BarChart3,
  path: '/org-dashboard',
  badge: null,
};

/** Base admin nav items visible to all admin users */
const adminNavigation = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/admin',
    badge: null,
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: Building2,
    children: [
      { path: '/admin/users', label: 'Users' },
      { path: '/admin/teams', label: 'Teams' },
      { path: '/admin/usage', label: 'Usage & Limits' },
      { path: '/admin/billing', label: 'Billing & Plans' },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    icon: Scale,
    children: [
      { path: '/admin/templates', label: 'Templates' },
      { path: '/admin/templates/builder', label: 'Template Builder' },
      { path: '/admin/templates/custom-fields', label: 'Custom Fields' },
    ],
  },
  {
    id: 'workspaces',
    label: 'Workspaces & Projects',
    icon: Database,
    children: [
      { path: '/admin/workspaces', label: 'All Workspaces' },
      { path: '/admin/projects', label: 'All Projects' },
      { path: '/admin/trash', label: 'Trash' },
    ],
  },
];

/** Build the navigation items list. Org Command Center only for platform admins. */
export function buildAdminNavItems(user: any): typeof adminNavigation {
  if (isPlatformAdmin(user)) {
    // Insert Org Command Center right after Dashboard
    const [dashboard, ...rest] = adminNavigation;
    return [dashboard, orgCommandCenterItem, ...rest];
  }
  return adminNavigation;
}

export function AdminLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const navItems = React.useMemo(() => buildAdminNavItems(user), [user]);
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const renderNavigationItem = (item: any) => {
    const isExpanded = expandedSections.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const hasPath = item.path && !hasChildren;

    // If it's a direct link (Dashboard), use NavLink
    if (hasPath) {
      return (
        <NavLink
          key={item.id}
          to={item.path}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors mb-2 ${
              isActive
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
          {item.badge && (
            <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {item.badge}
            </span>
          )}
        </NavLink>
      );
    }

    // If it has children, render as expandable section
    return (
      <div key={item.id} className="mb-2">
        <button
          onClick={() => toggleSection(item.id)}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
            isExpanded
              ? 'bg-gray-50 text-gray-900'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {isExpanded && (
          <div className="ml-6 mt-1 space-y-1">
            {item.children.map((child: any) => (
              <NavLink
                key={child.path}
                to={child.path}
                className={({ isActive }) =>
                  `block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-semibold text-gray-900">Admin Console</h1>
            <button
              onClick={() => navigate('/home')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
              title="Back to main app"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500">Manage your organization</p>
        </div>

        <nav className="p-4 flex-1 overflow-y-auto">
          {navItems.map(renderNavigationItem)}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
