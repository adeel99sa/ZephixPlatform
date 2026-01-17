import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/state/AuthContext';
import { telemetry } from '@/lib/telemetry';
import { listWorkspaces } from './api';
import type { Workspace } from './api';
import { WorkspaceCreateModal } from './WorkspaceCreateModal';
import { isAdminRole } from '@/types/roles';

export function SidebarWorkspaces() {
  const { user, loading: authLoading, activeWorkspaceId, setActiveWorkspaceId } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Phase 4: Only org owner or org admin can create workspaces
  const canCreateWorkspace = isAdminRole(user?.role);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen || !canCreateWorkspace) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen, canCreateWorkspace]);

  async function refresh() {
    // Guard: Don't fire requests until auth state is READY
    if (authLoading || !user) {
      return;
    }
    try {
      const data = await listWorkspaces();
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      setWorkspaces([]); // Set empty array on error
    }
  }

  useEffect(() => {
    // Guard: Wait for auth to be ready
    if (authLoading) {
      return;
    }
    if (!user) {
      setWorkspaces([]);
      return;
    }
    refresh();
  }, [authLoading, user]);

  function handleWorkspaceSelect(id: string) {
    if (!id) return;
    // Single source of truth: set activeWorkspaceId in AuthContext
    setActiveWorkspaceId(id);
    // Always navigate to workspace home
    navigate(`/workspaces/${id}/home`, { replace: true });
  }

  const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const availableWorkspaces = workspaces.filter(w => !w.deletedAt);

  // STEP 4: Auto-select FIRST workspace ONCE after login if none selected
  // Use ref to ensure this only happens once, not on every render
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    // Only auto-select if:
    // 1. Auth is ready
    // 2. User exists
    // 3. Workspaces are loaded
    // 4. No workspace is currently selected
    // 5. We haven't already initialized
    if (
      !authLoading &&
      user &&
      availableWorkspaces.length > 0 &&
      !activeWorkspaceId &&
      !hasInitializedRef.current
    ) {
      hasInitializedRef.current = true;
      const firstWorkspace = availableWorkspaces[0];
      if (firstWorkspace) {
        setActiveWorkspaceId(firstWorkspace.id);
        navigate(`/workspaces/${firstWorkspace.id}/home`, { replace: true });
        telemetry.track('workspace.selected', { workspaceId: firstWorkspace.id });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableWorkspaces.length, activeWorkspaceId, authLoading, user]);

  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  // Close plus menu when clicking outside
  useEffect(() => {
    if (!plusMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setPlusMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [plusMenuOpen]);

  return (
    <div className="px-2 mb-2" data-testid="sidebar-workspaces">
      {/* Workspace Dropdown and Plus Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <button
            ref={buttonRef}
            onClick={() => {
              if (availableWorkspaces.length > 0 && !currentWorkspace) {
                if (availableWorkspaces.length === 1) {
                  handleWorkspaceSelect(availableWorkspaces[0].id);
                } else {
                  setDropdownOpen(!dropdownOpen);
                }
              } else if (canCreateWorkspace) {
                setDropdownOpen(!dropdownOpen);
              }
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded border text-sm ${
              currentWorkspace
                ? 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            } ${availableWorkspaces.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
            data-testid="workspace-selector"
            disabled={availableWorkspaces.length === 0 && !canCreateWorkspace}
          >
            <span className="text-sm font-medium truncate flex-1 text-left">
              {currentWorkspace
                ? currentWorkspace.name
                : availableWorkspaces.length > 0
                  ? 'Select workspace'
                  : 'Select workspace'}
            </span>
            {canCreateWorkspace && availableWorkspaces.length > 0 && (
              <ChevronDown
                className={`h-4 w-4 text-gray-500 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            )}
          </button>

        {/* STEP 2: Dropdown menu - compact selector only, never renders full workspace list */}
        {/* STEP 4: Dropdown is for SWITCHING, not browsing - only shows list of workspace names */}
        {canCreateWorkspace && dropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-auto"
            data-testid="workspace-dropdown-menu"
          >
            <div className="py-1">
              {/* STEP 2: Compact list - just names, no full workspace cards */}
              {availableWorkspaces.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => handleWorkspaceSelect(ws.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    ws.id === activeWorkspaceId ? 'bg-blue-50 font-medium text-blue-700' : ''
                  }`}
                  data-testid={`workspace-option-${ws.id}`}
                >
                  {ws.name}
                </button>
              ))}
              {availableWorkspaces.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No workspaces yet
                </div>
              )}
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setOpen(true);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-blue-600 font-medium"
                data-testid="workspace-add-new"
              >
                <Plus className="h-4 w-4" />
                <span>Add new workspace</span>
              </button>
              {/* STEP 2: Link to /workspaces for full workspace list page */}
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/workspaces');
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-600"
                data-testid="workspace-browse-all"
              >
                Browse all workspaces...
              </button>
            </div>
          </div>
        )}
        </div>

        {/* Plus Button */}
        {activeWorkspaceId && (
          <div className="relative" ref={plusMenuRef}>
            <button
              onClick={() => setPlusMenuOpen(!plusMenuOpen)}
              className="flex items-center justify-center w-10 h-10 rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
              data-testid="workspace-plus-button"
            >
              <Plus className="h-4 w-4 text-gray-600" />
            </button>

            {/* Plus Menu Dropdown */}
            {plusMenuOpen && (
              <div className="absolute left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[180px]">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setPlusMenuOpen(false);
                      navigate('/templates');
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    Project
                  </button>
                  <button
                    onClick={() => {
                      setPlusMenuOpen(false);
                      navigate('/templates');
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    Template Center
                  </button>
                  <button
                    onClick={async () => {
                      setPlusMenuOpen(false);
                      if (!activeWorkspaceId) {
                        toast.error("Please select a workspace first");
                        return;
                      }
                      try {
                        const { createDoc } = await import("@/features/docs/api");
                        const docId = await createDoc(activeWorkspaceId, "Untitled");
                        navigate(`/docs/${docId}`, { replace: true });
                        toast.success("Doc created");
                      } catch (e: any) {
                        toast.error(e?.message || "Failed to create doc");
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    Doc
                  </button>
                  <button
                    onClick={async () => {
                      setPlusMenuOpen(false);
                      if (!activeWorkspaceId) {
                        toast.error("Please select a workspace first");
                        return;
                      }
                      try {
                        const { createForm } = await import("@/features/forms/api");
                        const formId = await createForm(activeWorkspaceId, "Untitled");
                        navigate(`/forms/${formId}/edit`, { replace: true });
                        toast.success("Form created");
                      } catch (e: any) {
                        toast.error(e?.message || "Failed to create form");
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    Form
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workspace Create Modal - Org admin/owner only */}
      {canCreateWorkspace && (
        <WorkspaceCreateModal
          open={open}
          onClose={() => setOpen(false)}
          onCreated={() => {
            refresh();
          }}
        />
      )}

      {/* Non-admin message */}
      {!canCreateWorkspace && availableWorkspaces.length === 0 && (
        <div className="mt-2 px-3 py-2 text-xs text-gray-500 text-center">
          Contact an admin to get assigned to a workspace
        </div>
      )}
    </div>
  );
}
