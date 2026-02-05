import { Users, Building2, Shield, Settings, CreditCard, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const ADMIN_OVERVIEW_ROUTE = '/admin';

export interface AdminNavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  testId: string;
}

export interface AdminNavSection {
  key: string;
  label: string;
  items: AdminNavItem[];
}

export const adminNavConfig: AdminNavSection[] = [
  {
    key: 'users',
    label: 'User Management',
    items: [
      {
        id: 'users',
        label: 'Users',
        path: '/admin/users',
        icon: Users,
        testId: 'admin-nav-users',
      },
    ],
  },
  {
    key: 'organization',
    label: 'Organization',
    items: [
      {
        id: 'workspaces',
        label: 'Workspaces',
        path: '/admin/workspaces',
        icon: Building2,
        testId: 'admin-nav-workspaces',
      },
      {
        id: 'security',
        label: 'Security',
        path: '/admin/security',
        icon: Shield,
        testId: 'admin-nav-security',
      },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    items: [
      {
        id: 'general',
        label: 'General',
        path: '/admin/settings',
        icon: Settings,
        testId: 'admin-nav-settings',
      },
      {
        id: 'billing',
        label: 'Billing',
        path: '/admin/billing',
        icon: CreditCard,
        testId: 'admin-nav-billing',
      },
      {
        id: 'audit',
        label: 'Audit Log',
        path: '/admin/audit',
        icon: Activity,
        testId: 'admin-nav-audit',
      },
    ],
  },
];
