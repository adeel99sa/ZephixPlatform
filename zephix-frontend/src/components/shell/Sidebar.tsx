import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { MoreHorizontal, ChevronRight, GripVertical, Star, Trash2 } from "lucide-react";

// import { useAuth } from "@/state/AuthContext";
import { SidebarWorkspaces } from "@/features/workspaces/SidebarWorkspaces";
import { WorkspaceCreateModal } from "@/features/workspaces/WorkspaceCreateModal";
import { useWorkspaceStore } from "@/state/workspace.store";
import { track } from "@/lib/telemetry";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { openWorkspaceSettingsModal } from "@/features/workspaces/components/WorkspaceSettingsModal/controller";
import { deleteWorkspace } from "@/features/workspaces/api";
import { useUIStore } from "@/stores/uiStore";

export function Sidebar() {
  // const { user } = useAuth();
  const navigate = useNavigate();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { setActiveWorkspace, activeWorkspaceId } = useWorkspaceStore();
  const { addToast } = useUIStore();
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const workspaceButtonRef = useRef<HTMLButtonElement>(null);

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

      {/* User Profile Dropdown - Below platform brand */}
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

                <button
                  onClick={handleEditWorkspace}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 text-left"
                  data-testid="menu-edit-workspace"
                  disabled={!activeWorkspaceId}
                >
                  <span>Edit workspace</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>

                <button
                  onClick={() => {
                    track('workspace.menu.sort', {});
                    // TODO: Implement drag-and-drop sorting when backend endpoint exists
                    addToast({
                      type: 'info',
                      title: 'Coming soon',
                      message: 'Workspace sorting will be available soon.',
                    });
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 text-left"
                  data-testid="menu-sort-workspace"
                >
                  <span className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4" />
                    Sort workspace
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>

                <button
                  onClick={() => {
                    track('workspace.menu.save-template', {});
                    addToast({
                      type: 'info',
                      title: 'Coming soon',
                      message: 'Save workspace as template feature is coming soon.',
                    });
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-left"
                  data-testid="menu-save-template"
                >
                  <Star className="h-4 w-4" />
                  <span>Save as template</span>
                </button>

                <button
                  onClick={handleDeleteWorkspace}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-left text-red-600"
                  data-testid="menu-delete-workspace"
                  disabled={!activeWorkspaceId}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete workspace</span>
                </button>
              </div>

              <div className="border-t border-gray-200 my-1"></div>

              <div className="py-1">
                <button
                  onClick={handleCreateWorkspace}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  data-testid="menu-add-workspace"
                >
                  + Add new workspace
                </button>

                <button
                  onClick={handleManageWorkspace}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  data-testid="menu-browse-workspaces"
                >
                  Browse all workspaces
                </button>

                <button
                  onClick={handleArchiveTrash}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 text-left"
                  data-testid="menu-view-archive"
                >
                  <span>View archive/trash</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Workspace selector directly under Workspaces */}
        <div className="px-1">
          <SidebarWorkspaces />
        </div>

        <NavLink
          data-testid="nav-templates"
          to="/templates"
          className={({ isActive }) =>
            `block rounded px-3 py-2 text-sm ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`
          }
        >
          Template Center
        </NavLink>

        <NavLink
          data-testid="nav-resources"
          to="/resources"
          className={({ isActive }) =>
            `block rounded px-3 py-2 text-sm ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`
          }
        >
          Resources
        </NavLink>

        <NavLink
          data-testid="nav-analytics"
          to="/analytics"
          className={({ isActive }) =>
            `block rounded px-3 py-2 text-sm ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`
          }
        >
          Analytics
        </NavLink>

        <NavLink
          data-testid="nav-settings"
          to="/settings"
          className={({ isActive }) =>
            `block rounded px-3 py-2 text-sm ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`
          }
        >
          Settings
        </NavLink>
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
