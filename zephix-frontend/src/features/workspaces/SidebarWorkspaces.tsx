import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Plus } from 'lucide-react';

import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { telemetry } from '@/lib/telemetry';
import { listWorkspaces } from './api';
import type { Workspace } from './types';
import { WorkspaceCreateModal } from './WorkspaceCreateModal';
import { isAdminRole } from '@/types/roles';

export function SidebarWorkspaces() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
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

  // PHASE 5.3: Workspace selection - always go to /w/:slug/home
  const handleWorkspaceSelect = (workspaceId: string) => {
    setActiveWorkspace(workspaceId);
    setDropdownOpen(false);
    telemetry.track('workspace.selected', { workspaceId });

    // Find workspace slug
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace?.slug) {
      // PHASE 5.3: Navigate to /w/:slug/home
      navigate(`/w/${workspace.slug}/home`, { replace: false });
    } else {
      // Fallback to old route if slug not available
      navigate(`/workspaces/${workspaceId}`, { replace: false });
    }
  };

  const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const availableWorkspaces = workspaces.filter(w => !w.deletedAt);

  // Phase 5.1: Auto-select if only one workspace exists
  useEffect(() => {
    if (availableWorkspaces.length === 1 && !activeWorkspaceId && !authLoading && user) {
      const singleWorkspace = availableWorkspaces[0];
      if (singleWorkspace) {
        setActiveWorkspace(singleWorkspace.id);
        navigate(`/workspaces/${singleWorkspace.id}`);
        telemetry.track('workspace.selected', { workspaceId: singleWorkspace.id });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableWorkspaces.length, activeWorkspaceId, authLoading, user]);

  return (
    <div className="px-2 mb-2" data-testid="sidebar-workspaces">
      {/* Workspace Dropdown - Monday.com style rectangular box */}
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => {
            if (availableWorkspaces.length > 0 && !currentWorkspace) {
              // Phase 5.1: Make "Select workspace" clickable
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

        {/* Dropdown menu - only visible for org admins/owners */}
        {canCreateWorkspace && dropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-auto"
            data-testid="workspace-dropdown-menu"
          >
            <div className="py-1">
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
            </div>
          </div>
        )}
      </div>

      {/* Workspace Create Modal - Org admin/owner only */}
      {canCreateWorkspace && (
        <WorkspaceCreateModal
          open={open}
          onClose={() => setOpen(false)}
          onCreated={(workspaceId) => {
            refresh();
            setActiveWorkspace(workspaceId);
            navigate(`/workspaces/${workspaceId}`);
            telemetry.track('workspace.created', { workspaceId });
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
