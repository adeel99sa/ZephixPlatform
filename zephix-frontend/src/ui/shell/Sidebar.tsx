import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import {
  CheckSquare,
  ChevronsLeft,
  ChevronsRight,
  FolderOpen,
  Home,
  Inbox,
  LayoutDashboard,
  Plus,
  Settings,
  Star,
  UserPlus,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { SidebarSection } from "./SidebarSection";
import { SidebarItem } from "./SidebarItem";
import { SidebarWorkspaceRow, type WorkspaceMenuAction } from "./SidebarWorkspaceRow";
import type { AnchoredMenuItem } from "./AnchoredMenu";
import { PortalTooltip } from "./PortalTooltip";
import { useInboxDrawer } from "./AppShell";

import { useAuth } from "@/state/AuthContext";
import { useWorkspaceStore } from "@/state/workspace.store";
import { useTemplateCenterModalStore } from "@/state/templateCenterModal.store";
import { useFavoritesStore } from "@/state/favorites.store";
import {
  archiveWorkspace,
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
  renameWorkspace,
  type Workspace,
} from "@/features/workspaces/api";
import { getWorkspaceDashboardRoute } from "@/features/navigation/workspace-routes";
import { WorkspaceCreateModal } from "@/features/workspaces/WorkspaceCreateModal";
import { WorkspaceMemberInviteModal } from "@/features/workspaces/components/WorkspaceMemberInviteModal";
import { WorkspaceShareModal } from "@/features/workspaces/components/WorkspaceShareModal";
import { TemplateSelectionModal } from "@/features/workspaces/components/TemplateSelectionModal";
import { projectKeys, useProjects } from "@/features/projects/hooks";

export type SidebarState = { collapsed: boolean; setCollapsed: (v: boolean) => void };

function SidebarWorkspaceProjectList({
  workspaceId,
  enabled,
}: {
  workspaceId: string;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    data: projects = [],
    isLoading,
    isError,
  } = useProjects(workspaceId, {
    enabled: enabled && !!workspaceId,
  });

  if (!enabled) return null;

  if (isLoading) {
    return (
      <div className="mb-1 pl-10 pr-2 py-1 text-[11px] text-slate-400">
        Loading projects…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mb-1 pl-10 pr-2 py-1">
        <p className="text-[11px] text-red-600">Couldn&apos;t load projects</p>
        <button
          type="button"
          onClick={() => {
            void queryClient.invalidateQueries({
              queryKey: projectKeys.list(workspaceId),
            });
          }}
          className="mt-0.5 text-[11px] font-medium text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="mb-1 pl-10 pr-2 py-1 text-[11px] text-slate-400">
        No projects yet
      </div>
    );
  }

  return (
    <ul className="mb-1 space-y-0.5">
      {projects.map((p) => {
        const projectActive = location.pathname.startsWith(`/projects/${p.id}`);
        return (
          <li key={p.id} className="relative pl-10">
            {/* Horizontal branch from tree guide to row */}
            <span
              className="pointer-events-none absolute left-8 top-1/2 h-px w-2 -translate-y-1/2 bg-slate-200/80"
              aria-hidden
            />
            <button
              type="button"
              onClick={() => navigate(`/projects/${p.id}/overview`)}
              className={`relative w-full truncate rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                projectActive
                  ? "bg-blue-50 font-medium text-blue-800"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar({ collapsed = false, onCollapse, onExpand }: { collapsed?: boolean; onCollapse?: () => void; onExpand?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeWorkspaceId, setActiveWorkspace, clearActiveWorkspace } = useWorkspaceStore();
  const openTemplateCenter = useTemplateCenterModalStore(
    (s) => s.openTemplateCenter,
  );
  const { items: favorites, addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
  const { toggleInbox, inboxOpen } = useInboxDrawer();

  const [workspaceCreateOpen, setWorkspaceCreateOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [projectCreateWorkspaceId, setProjectCreateWorkspaceId] = useState<string | null>(null);

  // Sharing modal state
  const [shareWorkspace, setShareWorkspace] = useState<Workspace | null>(null);

  // Rename state
  const [renameTarget, setRenameTarget] = useState<Workspace | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);

  // Confirm delete state
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  /** Workspace folders expanded in the tree (chevron); independent of current route. */
  const [expandedWorkspaceIds, setExpandedWorkspaceIds] = useState<Set<string>>(
    () => new Set(),
  );

  const headerMenuRef = useRef<HTMLDivElement>(null);
  const headerButtonRef = useRef<HTMLButtonElement>(null);

  const role = (user?.platformRole || user?.role || "").toUpperCase();
  const isViewer = role === "VIEWER";
  const isAdmin = role === "ADMIN";
  const canCreateWorkspace = isAdmin;

  const favoriteItems = useMemo(() => favorites.slice(0, 8), [favorites]);

  // ── React Query for workspaces ──
  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: listWorkspaces,
    staleTime: 30_000,
  });

  function invalidateWorkspaces() {
    void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  }

  // Close header menu on outside click / Escape
  useEffect(() => {
    if (!headerMenuOpen) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        headerMenuRef.current?.contains(target) ||
        headerButtonRef.current?.contains(target)
      ) return;
      setHeaderMenuOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setHeaderMenuOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [headerMenuOpen]);

  function handleOpenWorkspace(workspace: Workspace) {
    setActiveWorkspace(workspace.id, workspace.name);
    navigate(getWorkspaceDashboardRoute(workspace.id));
  }

  function toggleWorkspaceExpand(workspaceId: string, e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setExpandedWorkspaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(workspaceId)) next.delete(workspaceId);
      else next.add(workspaceId);
      return next;
    });
  }

  // Auto-expand when user is on a workspace route or when active workspace changes (e.g. project deep link).
  useEffect(() => {
    workspaces.forEach((w) => {
      if (
        location.pathname === `/workspaces/${w.id}` ||
        location.pathname.startsWith(`/workspaces/${w.id}/`)
      ) {
        setExpandedWorkspaceIds((prev) => new Set(prev).add(w.id));
      }
    });
  }, [location.pathname, workspaces]);

  useEffect(() => {
    if (activeWorkspaceId) {
      setExpandedWorkspaceIds((prev) => new Set(prev).add(activeWorkspaceId));
    }
  }, [activeWorkspaceId]);

  function handleWorkspaceMenuAction(workspace: Workspace, action: WorkspaceMenuAction) {
    switch (action) {
      // ── Favorite ──
      case "favorite": {
        const favKey = { type: "workspace" as const, id: workspace.id };
        if (isFavorite(favKey)) {
          removeFavorite(favKey);
        } else {
          addFavorite({
            type: "workspace",
            id: workspace.id,
            name: workspace.name,
            route: getWorkspaceDashboardRoute(workspace.id),
          });
        }
        break;
      }

      // ── Rename ──
      case "rename":
        setRenameTarget(workspace);
        setRenameValue(workspace.name);
        break;

      // ── Copy Link ──
      case "copy-link":
        navigator.clipboard.writeText(
          `${window.location.origin}${getWorkspaceDashboardRoute(workspace.id)}`,
        );
        break;

      // ── Create new ──
      case "create-folder":
        setActiveWorkspace(workspace.id, workspace.name);
        setProjectCreateWorkspaceId(workspace.id);
        break;

      case "create-dashboard":
        setActiveWorkspace(workspace.id, workspace.name);
        navigate(`/workspaces/${workspace.id}/dashboards`);
        break;

      case "create-template":
        setActiveWorkspace(workspace.id, workspace.name);
        openTemplateCenter(workspace.id);
        break;

      // ── Templates ──
      case "browse-templates":
        setActiveWorkspace(workspace.id, workspace.name);
        openTemplateCenter(workspace.id);
        break;

      case "save-as-template":
        setActiveWorkspace(workspace.id, workspace.name);
        openTemplateCenter(workspace.id);
        break;

      case "update-template":
        setActiveWorkspace(workspace.id, workspace.name);
        openTemplateCenter(workspace.id);
        break;

      // ── Duplicate ──
      case "duplicate":
        void (async () => {
          try {
            const result = await createWorkspace({
              name: `${workspace.name} (copy)`,
              description: workspace.description,
            });
            invalidateWorkspaces();
            navigate(getWorkspaceDashboardRoute(result.workspaceId));
          } catch {
            // silently fail — user can retry
          }
        })();
        break;

      // ── Archive ──
      case "archive":
        void (async () => {
          try {
            await archiveWorkspace(workspace.id);
            invalidateWorkspaces();
          } catch {
            // silently fail
          }
        })();
        break;

      // ── Delete ──
      case "delete":
        setDeleteTarget(workspace);
        break;

      // ── Sharing & Permissions ──
      case "sharing":
        setShareWorkspace(workspace);
        break;
    }
  }

  // ── Rename submit ──
  async function handleRenameSubmit() {
    if (!renameTarget || !renameValue.trim() || renameBusy) return;
    setRenameBusy(true);
    try {
      await renameWorkspace(renameTarget.id, renameValue.trim());
      invalidateWorkspaces();
      setRenameTarget(null);
    } catch {
      // keep modal open on error
    } finally {
      setRenameBusy(false);
    }
  }

  // ── Delete confirm ──
  async function handleDeleteConfirm() {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    try {
      await deleteWorkspace(deleteTarget.id);
      // Clear active workspace if it was the deleted one
      if (activeWorkspaceId === deleteTarget.id) {
        clearActiveWorkspace();
        navigate("/home", { replace: true });
      }
      invalidateWorkspaces();
      setDeleteTarget(null);
    } catch {
      // keep modal open on error
    } finally {
      setDeleteBusy(false);
    }
  }

  // ── Hidden actions by role ──
  function getHiddenActions(): WorkspaceMenuAction[] {
    if (isViewer) {
      return [
        "rename", "create-folder", "create-dashboard", "create-template",
        "browse-templates", "save-as-template", "update-template", "duplicate", "archive", "delete", "sharing",
      ];
    }
    if (!isAdmin) {
      return ["delete", "archive"];
    }
    return [];
  }

  if (collapsed) {
    return (
      <aside className="flex h-screen w-full flex-col items-center border-r border-slate-200 bg-slate-50 py-3">
        <PortalTooltip label="Home">
          {({ onMouseEnter, onMouseLeave }) => (
            <button
              type="button"
              onClick={() => navigate("/home")}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              className="mb-4 text-lg font-bold text-slate-900"
            >
              Z
            </button>
          )}
        </PortalTooltip>
        <nav className="flex flex-1 flex-col items-center gap-2">
          <PortalTooltip label="Home">
            {({ onMouseEnter, onMouseLeave }) => (
              <button type="button" onClick={() => navigate("/home")} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Home className="h-4 w-4" /></button>
            )}
          </PortalTooltip>
          <PortalTooltip label="Inbox">
            {({ onMouseEnter, onMouseLeave }) => (
              <button type="button" onClick={toggleInbox} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className={`rounded-lg p-2 ${inboxOpen ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-100"}`}><Inbox className="h-4 w-4" /></button>
            )}
          </PortalTooltip>
          <PortalTooltip label="My Tasks">
            {({ onMouseEnter, onMouseLeave }) => (
              <button type="button" onClick={() => navigate("/my-tasks")} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><CheckSquare className="h-4 w-4" /></button>
            )}
          </PortalTooltip>
          <div className="my-1 h-px w-6 bg-slate-200" />
          {workspaces.slice(0, 5).map((ws) => {
            const isActive = location.pathname.startsWith(`/workspaces/${ws.id}`);
            return (
              <PortalTooltip key={ws.id} label={ws.name}>
                {({ onMouseEnter, onMouseLeave }) => (
                  <button
                    type="button"
                    onClick={() => handleOpenWorkspace(ws)}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                      isActive
                        ? "border border-blue-200 bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {ws.name.charAt(0).toUpperCase()}
                  </button>
                )}
              </PortalTooltip>
            );
          })}
        </nav>
        {onExpand ? (
          <div className="border-t border-slate-200 pt-2 flex justify-center">
            <PortalTooltip label="Expand sidebar">
              {({ onMouseEnter, onMouseLeave }) => (
                <button
                  type="button"
                  onClick={onExpand}
                  onMouseEnter={onMouseEnter}
                  onMouseLeave={onMouseLeave}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Expand sidebar"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              )}
            </PortalTooltip>
          </div>
        ) : null}
      </aside>
    );
  }

  return (
    <aside className="flex h-screen w-full shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      {/* ── Header: "Zephix" + collapse (<<) + add (+) ── */}
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="text-lg font-semibold text-slate-900"
        >
          Zephix
        </button>
        <div className="flex items-center gap-1">
          {onCollapse ? (
            <PortalTooltip label="Collapse sidebar">
              {({ onMouseEnter, onMouseLeave }) => (
                <button
                  type="button"
                  onClick={onCollapse}
                  onMouseEnter={onMouseEnter}
                  onMouseLeave={onMouseLeave}
                  className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Collapse sidebar"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
              )}
            </PortalTooltip>
          ) : null}

          <PortalTooltip label="Quick actions">
            {({ onMouseEnter, onMouseLeave }) => (
              <button
                ref={headerButtonRef}
                type="button"
                onClick={() => setHeaderMenuOpen((v) => !v)}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-800"
                aria-label="Quick actions"
                aria-expanded={headerMenuOpen}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </PortalTooltip>
        </div>
      </div>

      {/* Header dropdown menu */}
      {headerMenuOpen
        ? createPortal(
            <div
              ref={headerMenuRef}
              style={{
                position: "fixed",
                top: (headerButtonRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                left: (headerButtonRef.current?.getBoundingClientRect().left ?? 0) +
                  ((headerButtonRef.current?.getBoundingClientRect().width ?? 0) / 2) -
                  112,
                zIndex: 9999,
              }}
              className="w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
            >
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    setInviteModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <UserPlus className="h-4 w-4 text-slate-500" />
                  Invite Member
                </button>
              ) : null}
              {canCreateWorkspace ? (
                <button
                  type="button"
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    setWorkspaceCreateOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4 text-slate-500" />
                  Create New Workspace
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      {/* ── Scrollable nav body ── */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-2">
          <SidebarSection title="Main">
            <SidebarItem to="/home" icon={<Home className="h-4 w-4" />} label="Home" />
            <button
              type="button"
              onClick={toggleInbox}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                inboxOpen
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center"><Inbox className="h-4 w-4" /></span>
              <span className="truncate">Inbox</span>
            </button>
            <SidebarItem to="/my-tasks" icon={<CheckSquare className="h-4 w-4" />} label="My Tasks" />
          </SidebarSection>

          <SidebarSection
            title="Favorites"
            onCreateClick={() => navigate("/home")}
            createLabel="Add to Favorites"
          >
            {favoriteItems.length === 0 ? (
              <p className="flex items-center gap-1.5 px-2 py-2 text-xs text-slate-500">
                Click <Star className="inline h-3 w-3 text-amber-500" /> to add favorites to your sidebar.
              </p>
            ) : (
              favoriteItems.map((item) => (
                <div key={`${item.type}:${item.id}`} className="group/fav flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.type === "workspace") navigate(getWorkspaceDashboardRoute(item.id));
                      else if (item.type === "project") navigate(`/projects/${item.id}`);
                      else if (item.route) navigate(item.route);
                    }}
                    className="flex-1 truncate rounded-lg px-2 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    {item.name}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      removeFavorite({
                        type: item.type,
                        id: item.id,
                        workspaceId: item.workspaceId,
                      })
                    }
                    className="rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 group-hover/fav:opacity-100"
                    title="Remove favorite"
                  >
                    <Star className="h-3 w-3 fill-current" />
                  </button>
                </div>
              ))
            )}
          </SidebarSection>

          <SidebarSection
            title="Workspaces"
            collapsible
            defaultExpanded
            alwaysShowCreate
            straddleSettingsMenu
            settingsMenuItems={(() => {
              const items: AnchoredMenuItem[] = [];
              if (canCreateWorkspace) {
                items.push({
                  id: "create-workspace",
                  label: "Create Workspace",
                  icon: Plus,
                  onClick: () => setWorkspaceCreateOpen(true),
                });
              }
              items.push({
                id: "manage-workspaces",
                label: "Manage Workspaces",
                icon: Settings,
                divider: canCreateWorkspace,
                onClick: () => navigate("/workspaces"),
              });
              items.push({
                id: "browse-all",
                label: "Browse All Workspaces",
                icon: FolderOpen,
                onClick: () => navigate("/workspaces"),
              });
              return items;
            })()}
            onCreateClick={
              canCreateWorkspace
                ? () => setWorkspaceCreateOpen(true)
                : undefined
            }
            settingsLabel="Workspaces Settings"
            createLabel="Create Workspace"
          >
            {workspaces.length === 0 ? (
              <p className="px-2 py-2 text-xs text-slate-500">No workspaces yet.</p>
            ) : (
              workspaces.map((workspace) => {
                const onWorkspaceSurface = location.pathname.startsWith(
                  `/workspaces/${workspace.id}`,
                );
                const treeExpanded = expandedWorkspaceIds.has(workspace.id);
                const viewingProjectInWorkspace =
                  activeWorkspaceId === workspace.id &&
                  location.pathname.startsWith("/projects/");
                const rowActive = onWorkspaceSurface || viewingProjectInWorkspace;
                return (
                  <SidebarWorkspaceRow
                    key={workspace.id}
                    name={workspace.name}
                    workspaceId={workspace.id}
                    isFavorite={isFavorite({
                      type: "workspace",
                      id: workspace.id,
                    })}
                    active={rowActive}
                    expanded={treeExpanded}
                    indentClassName="pl-4"
                    onLabelClick={() => handleOpenWorkspace(workspace)}
                    onToggleExpand={(e) => toggleWorkspaceExpand(workspace.id, e)}
                    onMenuAction={(action) =>
                      handleWorkspaceMenuAction(workspace, action)
                    }
                    hiddenActions={getHiddenActions()}
                  >
                    <SidebarWorkspaceProjectList
                      workspaceId={workspace.id}
                      enabled={treeExpanded}
                    />
                  </SidebarWorkspaceRow>
                );
              })
            )}
          </SidebarSection>

          <SidebarSection
            title="Dashboards"
            hideTitle
            onCreateClick={() => {
              const targetWorkspaceId = activeWorkspaceId ?? workspaces[0]?.id;
              if (targetWorkspaceId) {
                navigate(`/workspaces/${targetWorkspaceId}/dashboard?openCardCenter=1`);
              } else {
                navigate("/home");
              }
            }}
            createLabel="Dashboard Template Center"
            alwaysShowCreate={true}
          >
            <SidebarItem
              to={activeWorkspaceId ? `/workspaces/${activeWorkspaceId}/dashboards` : "/home"}
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Dashboards"
            />
          </SidebarSection>
        </div>
      </nav>

      {/* ── Modals ── */}
      <WorkspaceCreateModal
        open={workspaceCreateOpen}
        onClose={() => setWorkspaceCreateOpen(false)}
        onCreated={() => {
          setWorkspaceCreateOpen(false);
          invalidateWorkspaces();
        }}
      />

      <WorkspaceMemberInviteModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />

      <TemplateSelectionModal
        isOpen={Boolean(projectCreateWorkspaceId)}
        onClose={() => setProjectCreateWorkspaceId(null)}
        preselectedWorkspaceId={projectCreateWorkspaceId || undefined}
        onSuccess={(projectId, workspaceId) => {
          setProjectCreateWorkspaceId(null);
          invalidateWorkspaces();
          if (workspaceId) {
            const ws = workspaces.find((row) => row.id === workspaceId);
            setActiveWorkspace(workspaceId, ws?.name ?? null);
          }
          window.dispatchEvent(
            new CustomEvent("project:created", {
              detail: { projectId, workspaceId },
            })
          );
        }}
      />

      {/* Sharing & Permissions modal */}
      {shareWorkspace ? (
        <WorkspaceShareModal
          open
          onClose={() => setShareWorkspace(null)}
          workspaceId={shareWorkspace.id}
          workspaceName={shareWorkspace.name}
          isPrivate={false}
          onTogglePrivate={() => {
            // TODO: toggle visibility when backend supports PATCH visibility
          }}
        />
      ) : null}

      {/* Rename dialog */}
      {renameTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30" onClick={() => setRenameTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-900 mb-3">Rename Workspace</h3>
            <input
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") void handleRenameSubmit(); }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRenameSubmit()}
                disabled={!renameValue.trim() || renameBusy}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {renameBusy ? "Saving..." : "Rename"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete confirmation dialog */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-900 mb-2">Delete Workspace</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete <span className="font-medium">{deleteTarget.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteConfirm()}
                disabled={deleteBusy}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteBusy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
