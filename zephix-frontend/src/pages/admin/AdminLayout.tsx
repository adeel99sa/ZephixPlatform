import { Outlet, NavLink } from 'react-router-dom';
import { Suspense } from 'react';

const links = [
  { to: '/admin/organization', label: 'Organization' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/roles', label: 'Roles & Permissions' },
  { to: '/admin/security', label: 'Security Policies' },
  { to: '/admin/workspaces', label: 'Workspaces' },
  { to: '/admin/api-keys', label: 'API Keys' },
  { to: '/admin/audit-logs', label: 'Audit Logs' },
  { to: '/admin/billing', label: 'Billing & Plans' },
  { to: '/admin/integrations', label: 'Integrations' },
  { to: '/admin/kpis', label: 'KPI Catalog' },
  { to: '/admin/templates', label: 'Templates Library' },
];

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
