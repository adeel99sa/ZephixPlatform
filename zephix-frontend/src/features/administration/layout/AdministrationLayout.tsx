import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { ADMINISTRATION_NAV_SECTIONS } from "@/features/administration/constants";

const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 380;
const SIDEBAR_DEFAULT = 256; // w-64
const SIDEBAR_COLLAPSED = 64; // w-16

export default function AdministrationLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isResizing) return;
    const onMouseMove = (e: MouseEvent) => {
      const width = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, e.clientX));
      setSidebarWidth(width);
      if (collapsed && width > SIDEBAR_COLLAPSED) setCollapsed(false);
    };
    const onMouseUp = () => setIsResizing(false);
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing, collapsed]);

  return (
    <div className="h-full">
      <div className="lg:hidden p-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
          Administration tools are best used on desktop.
        </div>
      </div>

      <div className="hidden lg:flex h-full">
        <div
          className="relative shrink-0 transition-[width] duration-200"
          style={{ width: collapsed ? SIDEBAR_COLLAPSED : sidebarWidth }}
        >
          <aside className="flex h-full w-full flex-col border-r border-gray-200 bg-white">
            <div className="flex h-14 items-center border-b border-gray-200 px-3 gap-2">
              {!collapsed ? (
                <>
                  <button
                    type="button"
                    data-testid="admin-back-to-app"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    aria-label="Back to Home"
                    onClick={() => navigate("/home")}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                  <span className="text-sm font-semibold text-gray-900">Zephix administration</span>
                </>
              ) : (
                <button
                  type="button"
                  data-testid="admin-back-to-app"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  aria-label="Back to Home"
                  onClick={() => navigate("/home")}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              )}
              <div className="ml-auto">
                <button
                  type="button"
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
                  onClick={() => setCollapsed((prev) => !prev)}
                >
                  {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-2">
              {ADMINISTRATION_NAV_SECTIONS.map((section) => (
                <div key={section.label} className="mb-3">
                  {!collapsed ? (
                    <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {section.label}
                    </p>
                  ) : null}
                  {section.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `mb-1 flex items-center gap-2 rounded px-2 py-2 text-sm transition-colors ${
                          isActive
                            ? "bg-gray-100 font-medium text-gray-900"
                            : "text-gray-700 hover:bg-gray-50"
                        } ${collapsed ? "justify-center" : ""}`
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed ? <span>{item.label}</span> : null}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
          </aside>

          {/* Resize handle */}
          {!collapsed ? (
            <button
              type="button"
              onMouseDown={() => setIsResizing(true)}
              onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT)}
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500/25"
              aria-label="Resize sidebar"
              title="Drag to resize. Double-click to reset."
            />
          ) : null}
        </div>

        <section className="min-w-0 flex-1 overflow-auto bg-gray-50 p-6">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
