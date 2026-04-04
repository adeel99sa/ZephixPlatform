import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Plus } from 'lucide-react';

import { listWorkspaces } from './api';
import type { Workspace } from './api';
import { WorkspaceCreateModal } from './WorkspaceCreateModal';

import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { telemetry } from '@/lib/telemetry';
import { isAdminRole } from '@/types/roles';
import { isPlatformViewer } from '@/utils/access';

export function SidebarWorkspaces() {
  const { user, isLoading: authLoading } = useAuth();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const canCreateWorkspace = isAdminRole(user?.role);

  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (
        dropdownRef.current?.contains(t) ||
        buttonRef.current?.contains(t)
      ) {
        return;
      }
      setDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  async function refresh() {
    if (authLoading || !user) {
      return;
    }
    try {
      const data = await listWorkspaces();
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      setWorkspaces([]);
    }
  }

  useEffect(() => {
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
    setActiveWorkspace(id);
    navigate(`/workspaces/${id}/home`, { replace: true });
    setDropdownOpen(false);
    setPlusMenuOpen(false);
  }

  const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const availableWorkspaces = workspaces.filter(w => !w.deletedAt);

  /**
   * Only auto-select when the API returns exactly one workspace (unambiguous real context).
   * Do not auto-select when multiple workspaces exist — the user must pick (no implied default).
   */
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (
      !authLoading &&
      user &&
      availableWorkspaces.length === 1 &&
      !activeWorkspaceId &&
      !hasInitializedRef.current
    ) {
      hasInitializedRef.current = true;
      const only = availableWorkspaces[0];
      if (only) {
        setActiveWorkspace(only.id);
        telemetry.track('workspace.selected', { workspaceId: only.id, reason: 'single_workspace' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableWorkspaces.length, activeWorkspaceId, authLoading, user]);

  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!plusMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (plusMenuRef.current?.contains(t) || plusButtonRef.current?.contains(t)) {
        return;
      }
      setPlusMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [plusMenuOpen]);

  const showWorkspacePicker =
    availableWorkspaces.length > 1 ||
    (availableWorkspaces.length === 1 && canCreateWorkspace);

  const toggleWorkspacePicker = () => {
    if (!showWorkspacePicker) return;
    setPlusMenuOpen(false);
    setDropdownOpen((v) => !v);
  };

  const handleWorkspaceRowClick = () => {
    if (availableWorkspaces.length === 0) return;

    if (availableWorkspaces.length === 1 && !currentWorkspace) {
      handleWorkspaceSelect(availableWorkspaces[0].id);
      return;
    }

    if (availableWorkspaces.length === 1 && currentWorkspace) {
      if (canCreateWorkspace) toggleWorkspacePicker();
      return;
    }

    toggleWorkspacePicker();
  };

  if (availableWorkspaces.length === 0 && !authLoading) {
    return (
      <div data-testid="sidebar-workspaces">
        {canCreateWorkspace && (
          <WorkspaceCreateModal
            open={open}
            onClose={() => setOpen(false)}
            onCreated={() => { refresh(); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mb-2" data-testid="sidebar-workspaces">
      <div className="flex items-stretch gap-1.5">
        <div className="relative min-w-0 flex-1">
          <button
            ref={buttonRef}
            type="button"
            onClick={handleWorkspaceRowClick}
            className={`flex w-full items-center gap-2 rounded-lg border-l-[3px] border-slate-200 bg-transparent pl-2 pr-2.5 py-2 text-left text-sm font-semibold text-slate-900 transition ${
              dropdownOpen
                ? 'border-blue-500/80 bg-slate-100'
                : 'hover:border-slate-300 hover:bg-slate-50'
            } ${
              availableWorkspaces.length === 1 && !!currentWorkspace && !canCreateWorkspace
                ? 'cursor-default hover:bg-transparent hover:border-slate-200'
                : ''
            }`}
            data-testid="workspace-selector"
            aria-expanded={dropdownOpen}
            aria-haspopup={showWorkspacePicker ? 'listbox' : undefined}
          >
            <span className="min-w-0 flex-1 truncate">
              {currentWorkspace
                ? currentWorkspace.name
                : 'Select workspace'}
            </span>
            {showWorkspacePicker && (
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>

          {dropdownOpen && showWorkspacePicker && (
            <div
              ref={dropdownRef}
              role="listbox"
              className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-md"
              data-testid="workspace-dropdown-menu"
            >
              {availableWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  role="option"
                  aria-selected={ws.id === activeWorkspaceId}
                  onClick={() => handleWorkspaceSelect(ws.id)}
                  className={`flex w-full px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-slate-50 ${
                    ws.id === activeWorkspaceId ? 'bg-blue-50 text-blue-800' : 'text-slate-800'
                  }`}
                  data-testid={`workspace-option-${ws.id}`}
                >
                  {ws.name}
                </button>
              ))}
              {canCreateWorkspace && (
                <>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-blue-700 hover:bg-slate-50"
                    data-testid="workspace-add-new"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    Add new workspace
                  </button>
                </>
              )}
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/workspaces');
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                data-testid="workspace-browse-all"
              >
                Browse all workspaces…
              </button>
            </div>
          )}
        </div>

        {activeWorkspaceId && !isPlatformViewer(user) && (
          <div className="relative flex shrink-0 items-center">
            <button
              ref={plusButtonRef}
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                setPlusMenuOpen((v) => !v);
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 ${
                plusMenuOpen ? 'bg-slate-100' : ''
              }`}
              data-testid="workspace-plus-button"
              aria-expanded={plusMenuOpen}
              aria-haspopup="menu"
              aria-label="Create in workspace"
            >
              <Plus className="h-4 w-4" />
            </button>

            {plusMenuOpen && (
              <div
                ref={plusMenuRef}
                role="menu"
                className="absolute right-0 top-full z-[100] mt-1 min-w-[11rem] max-w-[min(100vw-2rem,16rem)] rounded-lg border border-slate-200 bg-white py-1 shadow-md"
              >
                {/* Only routes that navigate to existing app surfaces (no silent create stubs). */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPlusMenuOpen(false);
                    navigate('/templates');
                  }}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                  data-testid="workspace-plus-new-project"
                >
                  New project
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {canCreateWorkspace && (
        <WorkspaceCreateModal
          open={open}
          onClose={() => setOpen(false)}
          onCreated={() => {
            refresh();
          }}
        />
      )}
    </div>
  );
}
