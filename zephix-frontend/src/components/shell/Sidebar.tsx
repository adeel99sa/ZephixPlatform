import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Archive,
  ChevronDown,
  Eye,
  Inbox,
  ListChecks,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { SidebarWorkspaces } from "@/features/workspaces/SidebarWorkspaces";
import { WorkspaceCreateModal } from "@/features/workspaces/WorkspaceCreateModal";
import { useWorkspaceStore } from "@/state/workspace.store";
import { useSidebarWorkspacesUiStore } from "@/state/sidebarWorkspacesUi.store";
import { track } from "@/lib/telemetry";
import { useAuth } from "@/state/AuthContext";
import { isPlatformAdmin } from "@/utils/access";
import { isPaidUser } from "@/utils/roles";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useProjects } from "@/features/projects/hooks";
import { FavoritesSidebarSection } from "@/components/shell/FavoritesSidebarSection";
import { listPublishedDashboards } from "@/features/dashboards/api";
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";

/* ────────────────────────────────────────────
   Sidebar — locked UX contract (Pass 1)
   ──────────────────────────────────────────── */

function InboxBadge() {
  const { unreadCount } = useUnreadNotifications();
  if (unreadCount === 0) return null;
  return (
    <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-semibold rounded-full leading-none">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}

/* ── Collapsible section header ── */
function SectionHeader({
  label,
  expanded,
  onToggle,
  plusLabel,
  onPlus,
  plusAlwaysVisible = false,
  onThreeDot,
  testId,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  plusLabel?: string;
  onPlus?: () => void;
  plusAlwaysVisible?: boolean;
  onThreeDot?: () => void;
  testId: string;
}) {
  return (
    <div className="group/section flex items-center gap-1 px-2 py-1.5" data-testid={testId}>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-900 hover:text-slate-950 transition"
        aria-expanded={expanded}
        data-testid={`${testId}-chevron`}
      >
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-700 transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
        {label}
      </button>
      <div className="ml-auto flex items-center gap-0.5">
        {onThreeDot && (
          <button
            type="button"
            onClick={onThreeDot}
            className="rounded p-0.5 text-slate-400 opacity-0 group-hover/section:opacity-100 hover:bg-slate-100 transition"
            aria-label={`${label} settings`}
            data-testid={`${testId}-more`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        )}
        {onPlus && (
          <button
            type="button"
            onClick={onPlus}
            className={`rounded p-0.5 text-slate-400 hover:bg-slate-100 transition ${
              plusAlwaysVisible ? "opacity-100" : "opacity-0 group-hover/section:opacity-100"
            }`}
            aria-label={plusLabel ?? `Add ${label}`}
            data-testid={`${testId}-plus`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function MenuToggleTrack({ on }: { on: boolean }) {
  return (
    <span
      className={`relative ml-auto h-5 w-9 shrink-0 rounded-full transition-colors ${
        on ? "bg-blue-600" : "bg-slate-200"
      }`}
      aria-hidden
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left] ${
          on ? "left-[18px]" : "left-0.5"
        }`}
      />
    </span>
  );
}

/** Workspace section: … opens settings (manage, list prefs); + creates a workspace (admin). */
function WorkspacesSectionHeader({
  expanded,
  onToggle,
  isAdmin,
  navigate,
  onCreateWorkspace,
}: {
  expanded: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  navigate: (path: string) => void;
  onCreateWorkspace: () => void;
}) {
  const showAllWorkspacesInPicker = useSidebarWorkspacesUiStore((s) => s.showAllWorkspacesInPicker);
  const showArchivedWorkspaces = useSidebarWorkspacesUiStore((s) => s.showArchivedWorkspaces);
  const setShowAllWorkspacesInPicker = useSidebarWorkspacesUiStore((s) => s.setShowAllWorkspacesInPicker);
  const setShowArchivedWorkspaces = useSidebarWorkspacesUiStore((s) => s.setShowArchivedWorkspaces);

  const [moreOpen, setMoreOpen] = useState(false);
  const moreWrapRef = useRef<HTMLDivElement>(null);

  const manageWorkspacesPath = isAdmin
    ? "/administration/workspaces"
    : "/workspaces";

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (moreWrapRef.current?.contains(t)) return;
      setMoreOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  const closeMenu = () => setMoreOpen(false);

  return (
    <div className="flex items-center gap-1 px-2 py-1.5" data-testid="section-workspaces">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-slate-950 transition"
        aria-expanded={expanded}
        data-testid="section-workspaces-chevron"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
        Workspace
      </button>
      <div className="ml-auto flex items-center gap-0.5">
        <div className="relative" ref={moreWrapRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`rounded p-0.5 text-slate-400 transition hover:bg-slate-100 focus-visible:opacity-100 ${
              moreOpen ? "opacity-100" : "opacity-0 group-hover/workspace-shell:opacity-100"
            }`}
            title="Workspace settings"
            aria-label="Workspace settings"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            data-testid="section-workspaces-more"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {moreOpen && (
            <div
              className="absolute right-0 top-full z-[130] mt-1 min-w-[14rem] rounded-lg border border-slate-200 bg-white py-1 shadow-md"
              role="menu"
              aria-label="Workspace settings"
              data-testid="section-workspaces-more-menu"
            >
              {isAdmin && (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                  onClick={() => {
                    closeMenu();
                    onCreateWorkspace();
                  }}
                  data-testid="section-workspaces-menu-create"
                >
                  <Plus className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  Create Workspace
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                onClick={() => {
                  closeMenu();
                  navigate(manageWorkspacesPath);
                  track("sidebar.workspaces_menu", { action: "manage_workspaces" });
                }}
                data-testid="section-workspaces-menu-manage"
              >
                Manage Workspaces
              </button>
              <div className="my-1 border-t border-slate-100" role="separator" />
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={showAllWorkspacesInPicker}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                onClick={() => {
                  const next = !showAllWorkspacesInPicker;
                  setShowAllWorkspacesInPicker(next);
                  track("sidebar.workspaces_plus_menu", {
                    action: "toggle_show_all_workspaces",
                    enabled: next,
                  });
                }}
                data-testid="section-workspaces-menu-show-all"
              >
                <Eye className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                <span className="min-w-0 flex-1">Show all workspaces</span>
                <MenuToggleTrack on={showAllWorkspacesInPicker} />
              </button>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={showArchivedWorkspaces}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                onClick={() => {
                  const next = !showArchivedWorkspaces;
                  setShowArchivedWorkspaces(next);
                  track("sidebar.workspaces_plus_menu", {
                    action: "toggle_show_archived_workspaces",
                    enabled: next,
                  });
                }}
                data-testid="section-workspaces-menu-show-archived"
              >
                <Archive className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                <span className="min-w-0 flex-1">Show archived</span>
                <MenuToggleTrack on={showArchivedWorkspaces} />
              </button>
            </div>
          )}
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              onCreateWorkspace();
            }}
            className="rounded p-0.5 text-slate-400 opacity-100 transition hover:bg-slate-100"
            title="Create Workspace"
            aria-label="Create Workspace"
            data-testid="section-workspaces-plus"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeWorkspaceId, setActiveWorkspace, clearActiveWorkspace } = useWorkspaceStore();
  const { workspaceCount, isLoading: orgWorkspaceLoading } = useOrgHomeState();
  const isAdmin = isPlatformAdmin(user);

  useEffect(() => {
    if (orgWorkspaceLoading) return;
    if (workspaceCount === 0 && activeWorkspaceId) {
      clearActiveWorkspace();
    }
  }, [orgWorkspaceLoading, workspaceCount, activeWorkspaceId, clearActiveWorkspace]);

  // Real project existence check — Projects link hidden until at least one exists
  const { data: projects } = useProjects(activeWorkspaceId, { enabled: !!activeWorkspaceId });
  const hasProjects = (projects?.length ?? 0) > 0;

  // Published dashboards = "Shared" content (only real sharing model that exists)
  const { data: publishedDashboards } = useQuery({
    queryKey: ['published-dashboards', activeWorkspaceId],
    queryFn: () => listPublishedDashboards(activeWorkspaceId!),
    enabled: !!activeWorkspaceId,
    staleTime: 30_000,
  });
  const hasSharedItems = (publishedDashboards?.length ?? 0) > 0;

  // Section collapse state
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [workspacesOpen, setWorkspacesOpen] = useState(true);
  const [dashboardsOpen, setDashboardsOpen] = useState(true);
  const [sharedOpen, setSharedOpen] = useState(true);

  // Create workspace modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateWorkspace = () => {
    setShowCreateModal(true);
    track("sidebar.create_workspace", {});
  };

  const handleWorkspaceCreated = (workspaceId: string) => {
    setActiveWorkspace(workspaceId);
    track("workspace.created", { workspaceId });
    setShowCreateModal(false);
  };

  return (
    <aside
      className="relative z-40 w-72 border-r border-slate-200/80 bg-white flex flex-col"
      data-testid="sidebar"
    >
      {/* Platform brand → Inbox */}
      <div className="p-3 border-b border-slate-200/80">
        <NavLink
          to="/inbox"
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-slate-50"
          data-testid="platform-brand"
          aria-label="Zephix — go to Inbox"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-700 to-teal-500 text-xs font-bold text-white shadow-sm">
            Z
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Zephix
          </span>
        </NavLink>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {/* ── Inbox ── */}
        <NavLink
          data-testid="nav-inbox"
          to="/inbox"
          className={({ isActive }) =>
            `mb-3 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-bold tracking-tight transition ${
              isActive
                ? "bg-blue-50 text-blue-900"
                : "text-slate-950 hover:bg-slate-50"
            }`
          }
        >
          <span className="flex items-center gap-2">
            <Inbox className="h-4 w-4 shrink-0" />
            Inbox
          </span>
          <InboxBadge />
        </NavLink>

        {/* ── My Work — paid Admin/Member only; Viewer: hidden (no read-only surface in v1) */}
        {isPaidUser(user) && (
          <NavLink
            data-testid="nav-my-work"
            to="/my-work"
            className={({ isActive }) =>
              `mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold tracking-tight transition ${
                isActive
                  ? "bg-blue-50 text-blue-900"
                  : "text-slate-950 hover:bg-slate-50"
              }`
            }
          >
            <ListChecks className="h-4 w-4 shrink-0" />
            My Work
          </NavLink>
        )}

        <div className="my-2 border-t border-slate-200/80" />

        {/* ── Favorites (recents + folders + sort — see FavoritesSidebarSection) ── */}
        <FavoritesSidebarSection
          expanded={favoritesOpen}
          onToggleExpanded={() => setFavoritesOpen(!favoritesOpen)}
        />

        <div className="my-2 border-t border-slate-200/80" />

        {/* ── Workspace: named group so header …/+ react to hover anywhere in section (incl. picker row) ── */}
        <div className="group/workspace-shell">
          <WorkspacesSectionHeader
            expanded={workspacesOpen}
            onToggle={() => setWorkspacesOpen(!workspacesOpen)}
            isAdmin={isAdmin}
            navigate={navigate}
            onCreateWorkspace={handleCreateWorkspace}
          />
          {workspacesOpen && (
            <div className="space-y-1">
              {orgWorkspaceLoading ? (
                <div
                  className="px-2 py-1.5 text-xs text-slate-500"
                  data-testid="workspaces-empty-loading"
                >
                  Loading workspace info…
                </div>
              ) : workspaceCount === 0 ? (
                /* ClickUp-style empty Spaces: no picker row until at least one workspace exists */
                <div className="px-2 py-1" data-testid="workspaces-empty-first">
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={handleCreateWorkspace}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                      data-testid="empty-create-workspace"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                      New workspace
                    </button>
                  ) : (
                    <p className="px-2 py-1.5 text-xs text-slate-400">
                      Ask an organization admin to create the first workspace.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="px-1">
                    <SidebarWorkspaces />
                  </div>

                  {activeWorkspaceId && hasProjects && (
                    <div className="ml-2 space-y-0.5">
                      <NavLink
                        data-testid="ws-nav-projects"
                        to="/projects"
                        className={({ isActive }) =>
                          `block rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                            isActive ? "bg-slate-100 text-slate-900" : "text-slate-800 hover:bg-slate-50"
                          }`
                        }
                      >
                        Projects
                      </NavLink>
                    </div>
                  )}

                  {!activeWorkspaceId && (
                    <div className="px-2 py-1.5" data-testid="workspaces-select-prompt">
                      <p className="text-xs leading-relaxed text-slate-500">
                        Select a workspace using the row above.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Dashboards (top-level, always visible for Admin) ── */}
        {isAdmin && (
          <>
            <div className="my-2 border-t border-slate-200/80" />
            <SectionHeader
              label="Dashboards"
              expanded={dashboardsOpen}
              onToggle={() => setDashboardsOpen(!dashboardsOpen)}
              onPlus={() => navigate("/dashboards")}
              plusLabel="Open Dashboard Center"
              plusAlwaysVisible
              testId="section-dashboards"
            />
            {dashboardsOpen && (
              <div className="px-2 py-2 text-xs text-slate-500">
                <p>No dashboards yet.</p>
                <p className="mt-1 text-slate-400">
                  Create a dashboard after you have projects to pull data from.
                </p>
              </div>
            )}
          </>
        )}

        {/* ── Shared (top-level, visible only when real shared items exist) ── */}
        {hasSharedItems && (
          <>
            <div className="my-2 border-t border-slate-200/80" />
            <SectionHeader
              label="Shared"
              expanded={sharedOpen}
              onToggle={() => setSharedOpen(!sharedOpen)}
              testId="section-shared"
            />
            {sharedOpen && (
              <div className="ml-2 space-y-0.5" data-testid="shared-list">
                {publishedDashboards!.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => navigate(`/dashboards/${d.id}`)}
                    className="block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 transition"
                    data-testid={`shared-item-${d.id}`}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mr-1.5">
                      Dashboard
                    </span>
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </nav>

      <WorkspaceCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleWorkspaceCreated}
      />
    </aside>
  );
}

