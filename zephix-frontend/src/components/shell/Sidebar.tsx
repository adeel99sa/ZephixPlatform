import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Archive,
  ChevronDown,
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
import { canCreateOrgWorkspace, isPlatformAdmin } from "@/utils/access";
import { isPaidUser } from "@/utils/roles";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { FavoritesSidebarSection } from "@/components/shell/FavoritesSidebarSection";
import { listPublishedDashboards } from "@/features/dashboards/api";
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";
import { useAdminWorkspacesModalStore } from "@/stores/adminWorkspacesModalStore";

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

/** Portalled tooltip that floats above an icon with a downward caret, matching ClickUp reference placement. */
function IconTooltip({ label, anchorRef }: { label: string; anchorRef: React.RefObject<HTMLButtonElement | null> }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const recompute = useCallback(() => {
    const btn = anchorRef.current;
    const tip = tipRef.current;
    if (!btn || !tip) return;
    const r = btn.getBoundingClientRect();
    const tw = tip.offsetWidth;
    // center tooltip horizontally over icon, but clamp so it doesn't go off-screen right
    const idealLeft = r.left + r.width / 2 - tw / 2;
    const clampedLeft = Math.min(idealLeft, window.innerWidth - tw - 8);
    setPos({ top: r.top - 6, left: Math.max(8, clampedLeft) });
  }, [anchorRef]);

  useEffect(() => { recompute(); }, [recompute]);

  // caret horizontal position: always point at icon center
  const caretLeft = anchorRef.current
    ? anchorRef.current.getBoundingClientRect().left + anchorRef.current.getBoundingClientRect().width / 2 - (pos?.left ?? 0)
    : 0;

  return createPortal(
    <div
      ref={tipRef}
      className="fixed z-[6000] pointer-events-none"
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, transform: "translateY(-100%)" }}
    >
      <div className="rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white whitespace-nowrap shadow-lg">
        {label}
      </div>
      {/* downward caret */}
      <div
        className="absolute top-full h-0 w-0"
        style={{
          left: caretLeft,
          marginLeft: -5,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "5px solid rgb(30 41 59)", /* slate-800 */
        }}
      />
    </div>,
    document.body,
  );
}

/** Workspaces section: … opens settings; + creates a workspace when allowed by org role. */
function WorkspacesSectionHeader({
  expanded,
  onToggle,
  isAdmin,
  canCreateSpace,
  navigate,
  onCreateWorkspace,
}: {
  expanded: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  canCreateSpace: boolean;
  navigate: (path: string) => void;
  onCreateWorkspace: () => void;
}) {
  const showArchivedWorkspaces = useSidebarWorkspacesUiStore((s) => s.showArchivedWorkspaces);
  const setShowArchivedWorkspaces = useSidebarWorkspacesUiStore((s) => s.setShowArchivedWorkspaces);

  const [moreOpen, setMoreOpen] = useState(false);
  const [moreAnchorRect, setMoreAnchorRect] = useState<DOMRect | null>(null);
  const moreWrapRef = useRef<HTMLDivElement>(null);
  const sectionMenuPanelRef = useRef<HTMLDivElement>(null);
  const ellipsisBtnRef = useRef<HTMLButtonElement>(null);
  const plusBtnRef = useRef<HTMLButtonElement>(null);
  const [ellipsisHover, setEllipsisHover] = useState(false);
  const [plusHover, setPlusHover] = useState(false);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (moreWrapRef.current?.contains(t)) return;
      if (sectionMenuPanelRef.current?.contains(t)) return;
      setMoreOpen(false);
      setMoreAnchorRect(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onScroll = () => {
      setMoreOpen(false);
      setMoreAnchorRect(null);
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onResize = () => {
      setMoreOpen(false);
      setMoreAnchorRect(null);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        setMoreAnchorRect(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const closeMenu = () => {
    setMoreOpen(false);
    setMoreAnchorRect(null);
  };

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
        Workspaces
      </button>
      <div className="ml-auto flex items-center gap-0.5">
        <div className="relative" ref={moreWrapRef}>
          <button
            ref={ellipsisBtnRef}
            type="button"
            onClick={(e) => {
              const next = !moreOpen;
              setMoreOpen(next);
              setMoreAnchorRect(next ? e.currentTarget.getBoundingClientRect() : null);
            }}
            onMouseEnter={() => setEllipsisHover(true)}
            onMouseLeave={() => setEllipsisHover(false)}
            className={`rounded p-0.5 text-slate-500 transition hover:bg-slate-100 ${
              moreOpen ? "bg-slate-100" : ""
            }`}
            aria-label="Workspace Settings"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            data-testid="section-workspaces-more"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {ellipsisHover && !moreOpen && <IconTooltip label="Workspace Settings" anchorRef={ellipsisBtnRef} />}
          {moreOpen && moreAnchorRect &&
            createPortal(
              <div
                ref={sectionMenuPanelRef}
                className="fixed z-[5000] min-w-[14rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                style={{
                  top: moreAnchorRect.bottom + 4,
                  left: Math.min(
                    window.innerWidth - 224 - 8,
                    Math.max(8, moreAnchorRect.right - 224),
                  ),
                }}
                role="menu"
                aria-label="Workspace settings"
                data-testid="section-workspaces-more-menu"
              >
                {canCreateSpace && (
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
                    New workspace
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                  onClick={() => {
                    closeMenu();
                    if (isAdmin) {
                      useAdminWorkspacesModalStore.getState().open();
                    } else {
                      navigate("/workspaces");
                    }
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
              </div>,
              document.body,
            )}
        </div>
        {canCreateSpace && (
          <>
            <button
              ref={plusBtnRef}
              type="button"
              onClick={() => {
                setMoreOpen(false);
                onCreateWorkspace();
              }}
              onMouseEnter={() => setPlusHover(true)}
              onMouseLeave={() => setPlusHover(false)}
              className="rounded p-0.5 text-slate-500 transition hover:bg-slate-100"
              aria-label="Create Workspace"
              data-testid="section-workspaces-plus"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            {plusHover && <IconTooltip label="Create Workspace" anchorRef={plusBtnRef} />}
          </>
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
  const canCreateSpace = canCreateOrgWorkspace(user);

  useEffect(() => {
    if (orgWorkspaceLoading) return;
    if (workspaceCount === 0 && activeWorkspaceId) {
      clearActiveWorkspace();
    }
  }, [orgWorkspaceLoading, workspaceCount, activeWorkspaceId, clearActiveWorkspace]);

  // Phase 4.7.1: hasProjects check + standalone Projects nav link removed.
  // Projects are surfaced through SidebarWorkspaces tree expansion.

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
      className="relative z-40 w-72 border-r border-slate-200/80 bg-white flex flex-col dark:border-slate-700/80 dark:bg-slate-900"
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

        {/* ── Workspaces: header …/+ ; child rows in SidebarWorkspaces ── */}
        <div className="group/workspace-shell">
          <WorkspacesSectionHeader
            expanded={workspacesOpen}
            onToggle={() => setWorkspacesOpen(!workspacesOpen)}
            isAdmin={isAdmin}
            canCreateSpace={canCreateSpace}
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
                /* Empty Workspaces: no picker row until at least one workspace exists */
                <div className="px-2 py-1" data-testid="workspaces-empty-first">
                  {canCreateSpace ? (
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
                /*
                 * Phase 4.7.1 hotfix: standalone "Projects" nav link removed.
                 * Projects are now reachable through workspace tree expansion
                 * in SidebarWorkspaces (chevron → child project list), so the
                 * duplicate top-level entry was redundant.
                 */
                <div className="px-1">
                  <SidebarWorkspaces />
                </div>
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

