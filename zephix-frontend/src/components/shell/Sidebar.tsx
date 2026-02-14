import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { MoreHorizontal, ChevronRight, Trash2 } from "lucide-react";

import { SidebarWorkspaces } from "@/features/workspaces/SidebarWorkspaces";
import { WorkspaceCreateModal } from "@/features/workspaces/WorkspaceCreateModal";
import { useWorkspaceStore } from "@/state/workspace.store";
import { track } from "@/lib/telemetry";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { openWorkspaceSettingsModal } from "@/features/workspaces/components/WorkspaceSettingsModal/controller";
import { deleteWorkspace } from "@/features/workspaces/api";
import { useUIStore } from "@/stores/uiStore";
import { useAuth } from "@/state/AuthContext";
import { isAdminRole } from "@/types/roles";
import { isPaidUser } from "@/utils/roles";
import { isPlatformAdmin, isPlatformViewer } from "@/utils/access";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useProgramsPortfoliosEnabled } from "@/lib/features";

function InboxBadge() {
  const { unreadCount } = useUnreadNotifications();
  if (unreadCount === 0) return null;
  return (
    <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { setActiveWorkspace, activeWorkspaceId } = useWorkspaceStore();
  const { addToast } = useUIStore();
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const workspaceButtonRef = useRef<HTMLButtonElement>(null);
  const enableProgramsPortfolios = useProgramsPortfoliosEnabled();

  // Close workspace menu when clicking outside
  useEffect(() => {
    if (!workspaceMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        workspaceMenuRef.current &&
        !workspaceMenuRef.current.contains(event.target as Node) &&
        workspaceButtonRef.current &&
        !workspaceButtonRef.current.contains(event.target as Node)
      ) {
        setWorkspaceMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [workspaceMenuOpen]);

  const handleCreateWorkspace = () => {
    setWorkspaceMenuOpen(false);
    setShowCreateModal(true);
    track('workspace.menu.create', {});
  };

  const handleManageWorkspace = () => {
    setWorkspaceMenuOpen(false);
    navigate('/workspaces');
    track('workspace.menu.manage', {});
  };

  const handleEditWorkspace = () => {
    if (activeWorkspaceId) {
      setWorkspaceMenuOpen(false);
      openWorkspaceSettingsModal(activeWorkspaceId);
      track('workspace.menu.edit', { workspaceId: activeWorkspaceId });
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspaceId) return;
    if (!confirm('Delete this workspace? You can restore it from Trash.')) return;

    try {
      setWorkspaceMenuOpen(false);
      await deleteWorkspace(activeWorkspaceId);
      track('workspace.deleted', { id: activeWorkspaceId });

      // Clear active workspace if it was deleted
      setActiveWorkspace(null);

      // Navigate to workspaces page
      navigate('/workspaces');

      addToast({
        type: 'success',
        title: 'Workspace deleted',
        message: 'The workspace has been moved to trash.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'Failed to delete workspace',
      });
    }
  };

  const handleArchiveTrash = () => {
    setWorkspaceMenuOpen(false);
    navigate('/admin/trash');
    track('workspace.menu.archive', {});
  };

  const handleWorkspaceCreated = (workspaceId: string) => {
    setActiveWorkspace(workspaceId);
    track('workspace.created', { workspaceId });
    setShowCreateModal(false);
  };

  return (
    <aside className="w-72 border-r bg-white flex flex-col">
      {/* Platform Brand - Top of sidebar */}
      <div className="p-3 border-b">
        <NavLink
          to="/home"
          className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors"
          data-testid="platform-brand"
          aria-label="Zephix Home"
        >
          <span>Zephix</span>
        </NavLink>
      </div>

      {/* User Profile Dropdown - Right under company name */}
      <div className="p-2 border-b">
        <UserProfileDropdown />
      </div>

      <nav className="flex-1 p-2 space-y-1">
        <NavLink
          data-testid="nav-home"
          to="/home"
          className={({ isActive }) =>
            `block rounded px-3 py-2 text-sm ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`
          }
        >
          Home
        </NavLink>

        {/* PHASE 7 MODULE 7.2: My Work - Paid users only */}
        {isPaidUser(user) && (
          <NavLink
            to="/my-work"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <span>My Work</span>
          </NavLink>
        )}

        {/* Inbox - Paid users only */}
        {isPaidUser(user) && (
          <NavLink
            data-testid="nav-inbox"
            to="/inbox"
            className={({ isActive }) =>
              `block rounded px-3 py-2 text-sm ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"} flex items-center justify-between`
            }
          >
            <span>Inbox</span>
            <InboxBadge />
          </NavLink>
        )}

        <div className="relative">
          <div className="flex items-center justify-between w-full rounded px-3 py-2 text-sm hover:bg-gray-50 group">
            <NavLink
              data-testid="nav-workspaces"
              to="/workspaces"
              className={({ isActive }) =>
                `flex-1 ${isActive ? "font-medium" : ""}`
              }
            >
              Workspaces
            </NavLink>
            <button
              ref={workspaceButtonRef}
              data-testid="nav-workspaces-kebab"
              className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault();
                setWorkspaceMenuOpen(!workspaceMenuOpen);
              }}
              aria-label="Workspace menu"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          {workspaceMenuOpen && (
            <div
              ref={workspaceMenuRef}
              className="absolute left-full ml-2 top-0 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
              data-testid="workspace-menu-dropdown"
            >
              <div className="py-1">
                <button
                  onClick={handleManageWorkspace}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 text-left"
                  data-testid="menu-manage-workspace"
                >
                  <span>Manage workspace</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>

                {/* Phase 2A: Edit and Delete workspace — hidden for guests */}
                {!isPlatformViewer(user) && (
                  <>
                    <button
                      onClick={handleEditWorkspace}
                      className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 text-left"
                      data-testid="menu-edit-workspace"
                      disabled={!activeWorkspaceId}
                    >
                      <span>Edit workspace</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>

                    {isPlatformAdmin(user) && (
                      <button
                        onClick={handleDeleteWorkspace}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-left text-red-600"
                        data-testid="menu-delete-workspace"
                        disabled={!activeWorkspaceId}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete workspace</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="border-t border-gray-200 my-1"></div>

              <div className="py-1">
                {/* Phase 2A: Create workspace — admin only (uses platformRole) */}
                {isPlatformAdmin(user) && (
                  <button
                    onClick={handleCreateWorkspace}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    data-testid="menu-add-workspace"
                  >
                    + Add new workspace
                  </button>
                )}

                <button
                  onClick={handleManageWorkspace}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  data-testid="menu-browse-workspaces"
                >
                  Browse all workspaces
                </button>

                {/* Phase 2A: Only show archive/trash for platform admins */}
                {isPlatformAdmin(user) && (
                  <button
                    onClick={handleArchiveTrash}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 text-left"
                    data-testid="menu-view-archive"
                  >
                    <span>View archive/trash</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Workspace selector directly under Workspaces */}
        <div className="px-1">
          <SidebarWorkspaces />
        </div>

        {/* Workspace navigation - only visible when a workspace is selected */}
        {activeWorkspaceId && (
          <div className="pl-4 pr-2 mt-2 space-y-1" data-testid="ws-nav-root">
            <NavLink
              data-testid="ws-nav-dashboard"
              to={`/workspaces/${activeWorkspaceId}`}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              data-testid="ws-nav-projects"
              to="/projects"
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`
              }
            >
              Projects
            </NavLink>
            {/* PHASE 6 MODULE 6: Portfolios and Programs navigation - Hidden by default for MVP */}
            {enableProgramsPortfolios && (
              <>
                <NavLink
                  data-testid="ws-nav-portfolios"
                  to={`/workspaces/${activeWorkspaceId}/portfolios`}
                  className={({ isActive }) =>
                    `block rounded px-3 py-2 text-sm ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`
                  }
                >
                  Portfolios
                </NavLink>
                <NavLink
                  data-testid="ws-nav-programs"
                  to={`/workspaces/${activeWorkspaceId}/programs`}
                  className={({ isActive }) =>
                    `block rounded px-3 py-2 text-sm ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`
                  }
                >
                  Programs
                </NavLink>
              </>
            )}
            {/* Phase 2A: Members — hidden for guests */}
            {!isPlatformViewer(user) && (
              <NavLink
                data-testid="ws-nav-members"
                to={`/workspaces/${activeWorkspaceId}/members`}
                className={({ isActive }) =>
                  `block rounded px-3 py-2 text-sm ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`
                }
              >
                Members
              </NavLink>
            )}
          </div>
        )}

        {/* Phase 2A: Template Center — hidden for guests */}
        {activeWorkspaceId && !isPlatformViewer(user) && (
          <NavLink
            data-testid="nav-templates"
            to="/templates"
            className={({ isActive }) =>
              `block rounded px-3 py-2 text-sm ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`
            }
          >
            Template Center
          </NavLink>
        )}

        <NavLink
          data-testid="nav-settings"
          to="/settings"
          className={({ isActive }) =>
            `block rounded px-3 py-2 text-sm ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`
          }
        >
          Settings
        </NavLink>

        {/* Phase 2A: Administration — platform admin only */}
        {isPlatformAdmin(user) && (
          <NavLink
            data-testid="nav-administration"
            to="/admin"
            className={({ isActive }) =>
              `block rounded px-3 py-2 text-sm ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`
            }
          >
            Administration
          </NavLink>
        )}
      </nav>

      {/* Removed bottom account block; profile is handled at top-left */}

      <WorkspaceCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleWorkspaceCreated}
      />
    </aside>
  );
}
