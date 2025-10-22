import { Outlet, NavLink } from 'react-router-dom';
import { Suspense } from 'react';
import { adminFlags } from '@/config/features';

const allLinks = [
  { to: '/admin/organization', label: 'Organization', flag: true },
  { to: '/admin/users', label: 'Users', flag: true },
  { to: '/admin/roles', label: 'Roles & Permissions', flag: true },
  { to: '/admin/security', label: 'Security Policies', flag: adminFlags.security },
  { to: '/admin/workspaces', label: 'Workspaces', flag: adminFlags.workspaces },
  { to: '/admin/api-keys', label: 'API Keys', flag: adminFlags.apiKeys },
  { to: '/admin/audit-logs', label: 'Audit Logs', flag: adminFlags.auditLogs },
  { to: '/admin/billing', label: 'Billing & Plans', flag: adminFlags.billing },
  { to: '/admin/integrations', label: 'Integrations', flag: adminFlags.integrations },
  { to: '/admin/kpis', label: 'KPI Catalog', flag: adminFlags.kpis },
  { to: '/admin/templates', label: 'Templates Library', flag: adminFlags.templates },
];

const links = allLinks.filter(link => link.flag);

export default function AdminLayout() {
  return (
    <div className="flex h-full">
      <aside className="w-64 border-r p-4 space-y-2">
        <h2 className="font-semibold text-lg mb-3">Administration</h2>
        <nav className="grid gap-1">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-2 py-1 rounded hover:bg-gray-100 ${isActive ? 'bg-gray-200 font-medium' : ''}`
              }
              end
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <Suspense fallback={<div>Loading admin…</div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
