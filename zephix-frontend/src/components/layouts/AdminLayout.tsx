import { Outlet, NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { Header } from "@/components/shell/Header";
import { AiAssistantPanel } from '@/components/shell/AiAssistantPanel';
import DemoBanner from '@/components/shell/DemoBanner';
import { useAuth } from '@/state/AuthContext';
import { adminNavConfig, ADMIN_OVERVIEW_ROUTE } from './admin-nav.config';

export function AdminLayout() {
  const location = useLocation();
  const { user } = useAuth();

  // Helper to check if a path is active
  const isPathActive = (path: string): boolean => {
    if (path === ADMIN_OVERVIEW_ROUTE) {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Admin Left Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Administration</h2>
          <p className="text-xs text-gray-500 mt-1">Organization management</p>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          {/* Legacy Overview link - kept for backward compatibility */}
          <NavLink
            to={ADMIN_OVERVIEW_ROUTE}
            data-testid="admin-nav-overview"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors mb-2 ${
                isActive || location.pathname === ADMIN_OVERVIEW_ROUTE
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`
            }
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Overview</span>
          </NavLink>

          {/* Grouped navigation sections */}
          <div className="space-y-4">
            {adminNavConfig.map((section) => (
              <div key={section.key} className="space-y-1">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section.label}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isPathActive(item.path);

                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      data-testid={item.testId}
                      className={({ isActive: navIsActive }) =>
                        `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                          navIsActive || isActive
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-700 hover:bg-gray-50"
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main Content Area with Header */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <DemoBanner email={user?.email} />
        <main className="relative min-w-0 flex-1 overflow-auto" data-testid="admin-main-content">
          <Outlet />
        </main>
      </div>

      {/* AI panel lives on the far right, overlayed */}
      <AiAssistantPanel />
    </div>
  );
}

