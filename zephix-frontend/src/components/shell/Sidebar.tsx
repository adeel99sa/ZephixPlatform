import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  MoreHorizontal,
  Plus,
  Inbox,
} from "lucide-react";

import { SidebarWorkspaces } from "@/features/workspaces/SidebarWorkspaces";
import { WorkspaceCreateModal } from "@/features/workspaces/WorkspaceCreateModal";
import { useWorkspaceStore } from "@/state/workspace.store";
import { track } from "@/lib/telemetry";
import { useAuth } from "@/state/AuthContext";
import { isPlatformAdmin } from "@/utils/access";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useProjects } from "@/features/projects/hooks";
import { useFavorites, useRemoveFavorite } from "@/features/favorites/hooks";
import type { Favorite } from "@/features/favorites/api";
import { useQuery } from "@tanstack/react-query";
import { listPublishedDashboards } from "@/features/dashboards/api";

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
        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 hover:text-slate-600 transition"
        aria-expanded={expanded}
        data-testid={`${testId}-chevron`}
      >
        <ChevronDown
          className={`h-3 w-3 transition-transform ${expanded ? "" : "-rotate-90"}`}
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

export function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const isAdmin = isPlatformAdmin(user);

  // Real project existence check — Projects link hidden until at least one exists
  const { data: projects } = useProjects(activeWorkspaceId, { enabled: !!activeWorkspaceId });
  const hasProjects = (projects?.length ?? 0) > 0;

  // Real favorites data
  const { data: favorites } = useFavorites();
  const removeFavorite = useRemoveFavorite();
  const hasFavorites = (favorites?.length ?? 0) > 0;

  // Published dashboards = "Shared" content (only real sharing model that exists)
  const { data: publishedDashboards } = useQuery({
    queryKey: ['published-dashboards', activeWorkspaceId],
    queryFn: () => listPublishedDashboards(activeWorkspaceId!),
    enabled: !!activeWorkspaceId,
    staleTime: 30_000,
  });
  const hasSharedItems = (publishedDashboards?.length ?? 0) > 0;

  // Section collapse state
  const [myTasksOpen, setMyTasksOpen] = useState(true);
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
      className="w-72 border-r border-slate-200/80 bg-white flex flex-col"
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
            `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-blue-50 text-blue-700"
                : "text-slate-700 hover:bg-slate-50"
            }`
          }
        >
          <span className="flex items-center gap-2">
            <Inbox className="h-4 w-4 shrink-0" />
            Inbox
          </span>
          <InboxBadge />
        </NavLink>

        {/* ── My Tasks ── */}
        <div className="mt-3">
          <SectionHeader
            label="My Tasks"
            expanded={myTasksOpen}
            onToggle={() => setMyTasksOpen(!myTasksOpen)}
            testId="section-my-tasks"
          />
          {myTasksOpen && (
            <div className="ml-4 border-l border-slate-200 pl-3 space-y-0.5" data-testid="my-tasks-children">
              <div className="px-2 py-1 text-xs italic text-slate-400 select-none">Assigned to Me</div>
              <div className="px-2 py-1 text-xs italic text-slate-400 select-none">Today and Overdue</div>
              <div className="px-2 py-1 text-xs italic text-slate-400 select-none">Personal</div>
              <div className="px-2 pt-1 text-[10px] text-slate-300">Available when tasks exist</div>
            </div>
          )}
        </div>

        <div className="my-2 border-t border-slate-200/80" />

        {/* ── Favorites ── real data from /favorites API */}
        <SectionHeader
          label="Favorites"
          expanded={favoritesOpen}
          onToggle={() => setFavoritesOpen(!favoritesOpen)}
          testId="section-favorites"
        />
        {favoritesOpen && (
          hasFavorites ? (
            <div className="ml-2 space-y-0.5" data-testid="favorites-list">
              {favorites!.map((fav) => (
                <FavoriteItem
                  key={fav.id}
                  favorite={fav}
                  onRemove={() =>
                    removeFavorite.mutate({
                      itemType: fav.itemType,
                      itemId: fav.itemId,
                    })
                  }
                  onNavigate={() => {
                    if (fav.itemType === 'workspace') navigate(`/workspaces/${fav.itemId}`);
                    else if (fav.itemType === 'project') navigate(`/projects/${fav.itemId}`);
                    else if (fav.itemType === 'dashboard') navigate(`/dashboards/${fav.itemId}`);
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              className="mx-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-3 py-3 text-sm text-slate-500"
              data-testid="favorites-empty"
            >
              No favorites yet.
              <div className="mt-1 text-xs text-slate-400">
                Add items you want quick access to after workspaces, dashboards, or projects exist.
              </div>
            </div>
          )
        )}

        <div className="my-2 border-t border-slate-200/80" />

        {/* ── Workspaces ── */}
        <SectionHeader
          label="Workspaces"
          expanded={workspacesOpen}
          onToggle={() => setWorkspacesOpen(!workspacesOpen)}
          onPlus={isAdmin ? handleCreateWorkspace : undefined}
          plusLabel="Create Workspace"
          plusAlwaysVisible
          onThreeDot={() => {
            navigate("/workspaces");
          }}
          testId="section-workspaces"
        />
        {workspacesOpen && (
          <div className="space-y-1">
            {/* Workspace selector */}
            <div className="px-1">
              <SidebarWorkspaces />
            </div>

            {/* Workspace-scoped children — only Projects for now */}
            {activeWorkspaceId && hasProjects && (
              <div className="ml-2 space-y-0.5">
                <NavLink
                  data-testid="ws-nav-projects"
                  to="/projects"
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-1.5 text-sm transition ${
                      isActive ? "bg-slate-100 font-medium" : "hover:bg-slate-50"
                    }`
                  }
                >
                  Projects
                </NavLink>
              </div>
            )}

            {/* No workspace empty state */}
            {!activeWorkspaceId && (
              <div className="mx-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-3 py-3 text-sm text-slate-500">
                No workspaces yet.
                <div className="mt-1 text-xs text-slate-400">
                  Create your first workspace to start organizing projects, dashboards, and shared items.
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleCreateWorkspace}
                    className="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 transition"
                    data-testid="empty-create-workspace"
                  >
                    Create Workspace
                  </button>
                )}
              </div>
            )}
          </div>
        )}

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
              <div className="mx-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-500">
                No dashboards yet.
                <div className="mt-1 text-xs text-slate-400">
                  Create a dashboard after you have projects to pull data from.
                </div>
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
                    className="block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition"
                    data-testid={`shared-item-${d.id}`}
                  >
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 mr-1.5">
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

/* ── Favorite item row ── */
const ITEM_TYPE_LABELS: Record<string, string> = {
  workspace: 'Workspace',
  project: 'Project',
  dashboard: 'Dashboard',
};

function FavoriteItem({
  favorite,
  onRemove,
  onNavigate,
}: {
  favorite: Favorite;
  onRemove: () => void;
  onNavigate: () => void;
}) {
  return (
    <div
      className="group/fav flex items-center justify-between rounded-lg px-3 py-1.5 text-sm hover:bg-slate-50 transition cursor-pointer"
      data-testid={`favorite-item-${favorite.id}`}
    >
      <button
        type="button"
        onClick={onNavigate}
        className="flex-1 truncate text-left text-slate-700"
      >
        <span className="text-[10px] uppercase tracking-wider text-slate-400 mr-1.5">
          {ITEM_TYPE_LABELS[favorite.itemType] ?? favorite.itemType}
        </span>
        {favorite.displayName}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-1 rounded p-0.5 text-slate-400 opacity-0 group-hover/fav:opacity-100 hover:bg-slate-200 hover:text-red-500 transition"
        aria-label="Remove from favorites"
        data-testid={`favorite-remove-${favorite.id}`}
      >
        <span className="text-xs">✕</span>
      </button>
    </div>
  );
}
