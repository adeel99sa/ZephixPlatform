import { useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

import { ADMINISTRATION_NAV_GROUPS } from "@/features/administration/constants";
import { useAdminWorkspacesModalStore } from "@/stores/adminWorkspacesModalStore";

export default function AdministrationLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const workspacesModalOpen = useAdminWorkspacesModalStore((s) => s.isOpen);
  const openWorkspacesModal = useAdminWorkspacesModalStore((s) => s.open);

  const navWidth = useMemo(() => (collapsed ? "w-16" : "w-64"), [collapsed]);

  return (
    <div className="h-full">
      <div className="lg:hidden p-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
          Administration tools are best used on desktop.
        </div>
      </div>

      <div className="hidden lg:flex h-full">
        <aside className={`${navWidth} shrink-0 border-r border-gray-200 bg-white transition-all`}>
          {/*
           * Admin Console MVP-1 — "Back to Zephix" exit affordance.
           * Per Admin Console Architecture Spec v1 §4.1: every Admin Console
           * page must offer a clear way back to the operational app. /inbox
           * is the universal post-login landing per the same spec, so it's
           * the safest target. When the sidebar is collapsed, only the
           * ArrowLeft icon shows; when expanded, the icon + label show.
           *
           * Use a full document navigation (native <a>) so leaving Administration
           * remounts DashboardLayout and shell state; React Router <Link> alone
           * can leave stale layout when switching sibling route trees.
           */}
          <a
            href="/inbox"
            data-testid="admin-back-to-zephix"
            title={collapsed ? "Back to Zephix" : undefined}
            className={`flex items-center gap-2 border-b border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:text-gray-900 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {!collapsed ? <span>Back to Zephix</span> : null}
          </a>
          <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3">
            {!collapsed ? (
              <div>
                <p className="text-sm font-semibold text-gray-900">Administration</p>
                <p className="text-xs text-gray-500">Control plane</p>
              </div>
            ) : (
              <p className="text-xs font-semibold text-gray-700">Adm</p>
            )}
            <button
              type="button"
              className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label={collapsed ? "Expand administration navigation" : "Collapse administration navigation"}
              onClick={() => setCollapsed((prev) => !prev)}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <nav className="p-2 space-y-3 overflow-y-auto" style={{ maxHeight: "calc(100vh - 120px)" }}>
            {ADMINISTRATION_NAV_GROUPS.map((group, groupIdx) => (
              <div key={group.label}>
                {groupIdx > 0 && <hr className="mb-2 border-gray-200" />}
                {!collapsed && (
                  <span className="mb-1 block px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {group.label}
                  </span>
                )}
                {group.items.map((item) =>
                  item.opensWorkspacesModal ? (
                    <button
                      key={`${item.path}-modal`}
                      type="button"
                      title={collapsed ? item.label : undefined}
                      aria-current={workspacesModalOpen ? "page" : undefined}
                      onClick={openWorkspacesModal}
                      className={`mb-0.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                        workspacesModalOpen
                          ? "bg-gray-100 font-medium text-gray-900"
                          : "text-gray-700 hover:bg-gray-50"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed ? <span>{item.label}</span> : null}
                    </button>
                  ) : (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/administration"}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `mb-0.5 flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
                          isActive
                            ? "bg-gray-100 font-medium text-gray-900"
                            : "text-gray-700 hover:bg-gray-50"
                        } ${collapsed ? "justify-center" : ""}`
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed ? <span>{item.label}</span> : null}
                    </NavLink>
                  ),
                )}
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 flex-1 select-text overflow-auto bg-gray-50 p-6">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
