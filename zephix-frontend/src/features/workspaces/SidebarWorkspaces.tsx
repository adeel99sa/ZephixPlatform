import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { listWorkspaces } from './api';
import type { Workspace } from './api';
import { WorkspaceCreateModal } from './WorkspaceCreateModal';

import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { telemetry } from '@/lib/telemetry';
import { isAdminRole } from '@/types/roles';
import { isPlatformViewer } from '@/utils/access';
import { isPaidUser } from '@/utils/roles';
import { useFavorites, useAddFavorite, useRemoveFavorite } from '@/features/favorites/hooks';

export function SidebarWorkspaces() {
  const { user, isLoading: authLoading } = useAuth();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [rowMoreOpen, setRowMoreOpen] = useState(false);
  const [rowPlusOpen, setRowPlusOpen] = useState(false);
  const rowMoreRef = useRef<HTMLDivElement>(null);
  const rowMoreBtnRef = useRef<HTMLButtonElement>(null);
  const rowPlusRef = useRef<HTMLDivElement>(null);
  const rowPlusBtnRef = useRef<HTMLButtonElement>(null);

  const { data: favorites } = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  const canCreateWorkspace = isAdminRole(user?.role);
  const paid = isPaidUser(user);

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

  useEffect(() => {
    if (!rowMoreOpen && !rowPlusOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (
        rowMoreRef.current?.contains(t) ||
        rowMoreBtnRef.current?.contains(t) ||
        rowPlusRef.current?.contains(t) ||
        rowPlusBtnRef.current?.contains(t)
      ) {
        return;
      }
      setRowMoreOpen(false);
      setRowPlusOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [rowMoreOpen, rowPlusOpen]);

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
    setRowPlusOpen(false);
    setRowMoreOpen(false);
  }

  const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const availableWorkspaces = workspaces.filter(w => !w.deletedAt);

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

  const showWorkspacePicker =
    availableWorkspaces.length > 1 ||
    (availableWorkspaces.length === 1 && canCreateWorkspace);

  const toggleWorkspacePicker = () => {
    if (!showWorkspacePicker) return;
    setRowPlusOpen(false);
    setRowMoreOpen(false);
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

  const workspaceFavorite = favorites?.find(
    (f) => f.itemType === 'workspace' && f.itemId === activeWorkspaceId,
  );

  const closeRowMenus = () => {
    setRowMoreOpen(false);
    setRowPlusOpen(false);
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
      <div className="flex items-stretch gap-1">
        <div className="relative min-w-0 flex-1">
          <div
            className={`flex w-full items-center gap-2 rounded-lg border border-transparent bg-slate-50/50 px-1.5 py-1 text-left transition ${
              dropdownOpen ? 'border-slate-200 bg-white shadow-sm' : 'hover:border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            <Building2
              className="h-4 w-4 shrink-0 text-slate-600"
              aria-hidden
            />
            <button
              ref={buttonRef}
              type="button"
              onClick={handleWorkspaceRowClick}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-sm font-semibold text-slate-900 transition ${
                availableWorkspaces.length === 1 && !!currentWorkspace && !canCreateWorkspace
                  ? 'cursor-default'
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
          </div>

          {dropdownOpen && showWorkspacePicker && (
            <div
              ref={dropdownRef}
              role="listbox"
              className="absolute left-0 right-0 top-full z-[130] mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-md"
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
          <>
            <div className="relative flex shrink-0 items-center" ref={rowMoreRef}>
              <button
                ref={rowMoreBtnRef}
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setRowPlusOpen(false);
                  setRowMoreOpen((v) => !v);
                }}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 ${
                  rowMoreOpen ? 'bg-slate-100' : ''
                }`}
                data-testid="workspace-row-more"
                aria-expanded={rowMoreOpen}
                aria-haspopup="menu"
                aria-label="Workspace actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {rowMoreOpen && (
                <div
                  className="absolute right-0 top-full z-[130] mt-1 min-w-[12rem] rounded-lg border border-slate-200 bg-white py-1 shadow-md"
                  role="menu"
                  data-testid="workspace-row-more-menu"
                >
                  {paid && activeWorkspaceId && (
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                      onClick={() => {
                        closeRowMenus();
                        navigate(`/workspaces/${activeWorkspaceId}/members`);
                      }}
                      data-testid="workspace-row-members"
                    >
                      Workspace members
                    </button>
                  )}
                  {activeWorkspaceId && (
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                      onClick={() => {
                        closeRowMenus();
                        if (workspaceFavorite) {
                          removeFavorite.mutate(
                            { itemType: 'workspace', itemId: activeWorkspaceId },
                            {
                              onError: () => toast.error('Could not update favorites'),
                            },
                          );
                        } else {
                          addFavorite.mutate(
                            { itemType: 'workspace', itemId: activeWorkspaceId },
                            {
                              onError: () => toast.error('Could not update favorites'),
                            },
                          );
                        }
                      }}
                      data-testid="workspace-row-favorite-toggle"
                    >
                      {workspaceFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="relative flex shrink-0 items-center" ref={rowPlusRef}>
              <button
                ref={rowPlusBtnRef}
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setRowMoreOpen(false);
                  setRowPlusOpen((v) => !v);
                }}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 ${
                  rowPlusOpen ? 'bg-slate-100' : ''
                }`}
                data-testid="workspace-plus-button"
                aria-expanded={rowPlusOpen}
                aria-haspopup="menu"
                aria-label="Create in workspace"
              >
                <Plus className="h-4 w-4" />
              </button>

              {rowPlusOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-[130] mt-1 min-w-[11rem] max-w-[min(100vw-2rem,16rem)] rounded-lg border border-slate-200 bg-white py-1 shadow-md"
                  data-testid="workspace-row-plus-menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      closeRowMenus();
                      navigate('/templates');
                    }}
                    className="w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                    data-testid="workspace-plus-new-project"
                  >
                    New project
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      closeRowMenus();
                      if (!activeWorkspaceId) {
                        toast.error('Please select a workspace first');
                        return;
                      }
                      try {
                        const { createDoc } = await import('@/features/docs/api');
                        const docId = await createDoc(activeWorkspaceId, 'Untitled');
                        navigate(`/docs/${docId}`, { replace: true });
                        toast.success('Doc created');
                      } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : 'Failed to create doc';
                        toast.error(msg);
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                    data-testid="workspace-plus-doc"
                  >
                    Doc
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      closeRowMenus();
                      if (!activeWorkspaceId) {
                        toast.error('Please select a workspace first');
                        return;
                      }
                      try {
                        const { createForm } = await import('@/features/forms/api');
                        const formId = await createForm(activeWorkspaceId, 'Untitled');
                        navigate(`/forms/${formId}/edit`, { replace: true });
                        toast.success('Form created');
                      } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : 'Failed to create form';
                        toast.error(msg);
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                    data-testid="workspace-plus-form"
                  >
                    Form
                  </button>
                </div>
              )}
            </div>
          </>
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
