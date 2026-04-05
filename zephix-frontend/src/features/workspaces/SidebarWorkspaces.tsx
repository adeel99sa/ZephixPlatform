import { useEffect, useState, useRef, useMemo, useCallback, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  BookOpen,
  Copy,
  FileText,
  LayoutTemplate,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Shield,
  ShieldAlert,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  listWorkspaces,
  renameWorkspace,
  deleteWorkspace,
  archiveWorkspace,
} from './api';
import type { Workspace } from './api';
import { WorkspaceCreateModal } from './WorkspaceCreateModal';
import { TemplateCenterModal } from '@/features/templates/components/TemplateCenterModal';

import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useSidebarWorkspacesUiStore } from '@/state/sidebarWorkspacesUi.store';
import { telemetry } from '@/lib/telemetry';
import {
  PLATFORM_TRASH_RETENTION_DAYS,
  trashRetentionArchiveSentence,
  trashRetentionDeleteSentence,
} from '@/lib/platformRetention';
import { isPlatformViewer, canCreateOrgWorkspace } from '@/utils/access';
import { useFavorites, useAddFavorite, useRemoveFavorite } from '@/features/favorites/hooks';

function SpaceMenuItem({
  icon,
  children,
  onClick,
  testId,
  danger,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  testId: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
        danger ? 'font-medium text-red-600 hover:bg-red-50' : 'text-slate-700'
      }`}
      data-testid={testId}
    >
      <span
        className={`shrink-0 [&>svg]:h-4 [&>svg]:w-4 ${danger ? 'text-red-500' : 'text-slate-400'}`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 font-medium">{children}</span>
    </button>
  );
}

const WORKSPACE_ROW_MENU_MIN_PX = 208;
const WORKSPACE_ROW_MENU_Z = 5000;
const ACTION_HOVER_TOOLTIP_Z = 6000;
/** Fallback when sidebar node is not found (Tailwind w-72 ≈ 288px) */
const SIDEBAR_WIDTH_FALLBACK_PX = 288;

function getSidebarRightEdgePx(): number {
  const el = document.querySelector('[data-testid="sidebar"]');
  if (el) {
    return el.getBoundingClientRect().right;
  }
  return SIDEBAR_WIDTH_FALLBACK_PX;
}

/** Place menu so it straddles sidebar / main boundary (~half in each panel). */
function fixedWorkspaceMenuStyle(rect: DOMRect, maxWidthPx?: number): CSSProperties {
  const pad = 8;
  const menuW = WORKSPACE_ROW_MENU_MIN_PX;
  const sidebarRight = getSidebarRightEdgePx();
  let left = sidebarRight - menuW / 2;
  left = Math.max(pad, Math.min(left, window.innerWidth - menuW - pad));
  const style: CSSProperties = {
    position: 'fixed',
    top: rect.bottom + 4,
    left,
    minWidth: WORKSPACE_ROW_MENU_MIN_PX,
    zIndex: WORKSPACE_ROW_MENU_Z,
  };
  if (maxWidthPx) {
    style.maxWidth = Math.min(maxWidthPx, window.innerWidth - 2 * pad);
  }
  return style;
}

type RowMenuAnchor = { wsId: string; rect: DOMRect };

/** Workspaces: row actions (… / +) show on hover; compact settings & create menus */
export function SidebarWorkspaces() {
  const { user, isLoading: authLoading } = useAuth();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const workspacesDirectoryNonce = useWorkspaceStore((s) => s.workspacesDirectoryNonce);
  const sidebarWorkspacePlaceholder = useWorkspaceStore((s) => s.sidebarWorkspacePlaceholder);
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [open, setOpen] = useState(false);
  const [moreMenu, setMoreMenu] = useState<RowMenuAnchor | null>(null);
  const [plusMenu, setPlusMenu] = useState<RowMenuAnchor | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [templateCenterWsId, setTemplateCenterWsId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  /** Portaled — avoids clipping by sidebar/nav overflow; centered above … / + */
  const [hoverActionTip, setHoverActionTip] = useState<{ text: string; rect: DOMRect } | null>(null);

  const { data: favorites } = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  const showArchivedWorkspaces = useSidebarWorkspacesUiStore((s) => s.showArchivedWorkspaces);

  const canCreateWorkspace = canCreateOrgWorkspace(user);
  const viewer = isPlatformViewer(user);

  const closeMenus = useCallback(() => {
    setMoreMenu(null);
    setPlusMenu(null);
  }, []);

  useEffect(() => {
    if (!moreMenu && !plusMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (menuPanelRef.current?.contains(t)) return;
      closeMenus();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreMenu, plusMenu, closeMenus]);

  useEffect(() => {
    if (!moreMenu && !plusMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreMenu, plusMenu, closeMenus]);

  useEffect(() => {
    if (!moreMenu && !plusMenu) return;
    const onScroll = () => closeMenus();
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [moreMenu, plusMenu, closeMenus]);

  useEffect(() => {
    if (!moreMenu && !plusMenu) return;
    const onResize = () => closeMenus();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [moreMenu, plusMenu, closeMenus]);

  useEffect(() => {
    if (!hoverActionTip) return;
    const clear = () => setHoverActionTip(null);
    window.addEventListener('scroll', clear, true);
    window.addEventListener('resize', clear);
    return () => {
      window.removeEventListener('scroll', clear, true);
      window.removeEventListener('resize', clear);
    };
  }, [hoverActionTip]);

  async function refresh() {
    if (authLoading || !user) {
      return;
    }
    try {
      const data = await listWorkspaces();
      const arr = Array.isArray(data) ? data : [];
      setWorkspaces(arr);
      const ph = useWorkspaceStore.getState().sidebarWorkspacePlaceholder;
      if (ph && arr.some((w) => w.id === ph.id)) {
        useWorkspaceStore.getState().setSidebarWorkspacePlaceholder(null);
      }
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
  }, [authLoading, user, workspacesDirectoryNonce]);

  const workspacesForPicker = useMemo(() => {
    const list = [...workspaces];
    const ph = sidebarWorkspacePlaceholder;
    const orgId = user?.organizationId ?? '';
    if (ph && !list.some((w) => w.id === ph.id)) {
      list.push({
        id: ph.id,
        name: ph.name,
        slug: '',
        organizationId: orgId,
        description: undefined,
        deletedAt: null,
        createdAt: '',
        updatedAt: '',
        createdBy: '',
        deletedBy: null,
      });
    }
    return list;
  }, [workspaces, sidebarWorkspacePlaceholder, user?.organizationId]);

  const listedWorkspaces = useMemo(
    () =>
      workspacesForPicker.filter((w) => {
        if (w.deletedAt) {
          return showArchivedWorkspaces;
        }
        return true;
      }),
    [workspacesForPicker, showArchivedWorkspaces],
  );

  function handleWorkspaceSelect(id: string) {
    if (!id) return;
    setActiveWorkspace(id);
    navigate(`/workspaces/${id}/home`, { replace: true });
    closeMenus();
  }

  const favoriteFor = useCallback(
    (wsId: string) => favorites?.find((f) => f.itemType === 'workspace' && f.itemId === wsId),
    [favorites],
  );

  function workspaceHomeUrl(wsId: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/workspaces/${wsId}/home`;
  }

  async function handleCopyLink(ws: Workspace) {
    closeMenus();
    const url = workspaceHomeUrl(ws.id);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  }

  async function submitRename() {
    if (!renameTarget || !renameDraft.trim()) return;
    setRenameBusy(true);
    try {
      await renameWorkspace(renameTarget.id, renameDraft.trim());
      toast.success('Workspace renamed');
      setRenameTarget(null);
      await refresh();
      telemetry.track('workspace.renamed', { workspaceId: renameTarget.id });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Rename failed';
      toast.error(msg);
    } finally {
      setRenameBusy(false);
    }
  }

  async function submitDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const { trashRetentionDays } = await deleteWorkspace(deleteTarget.id);
      toast.success('Workspace moved to Archive & delete', {
        description: trashRetentionDeleteSentence(trashRetentionDays),
      });
      if (activeWorkspaceId === deleteTarget.id) {
        setActiveWorkspace(null);
        navigate('/workspaces', { replace: true });
      }
      closeMenus();
      setDeleteTarget(null);
      await refresh();
      telemetry.track('workspace.deleted', { workspaceId: deleteTarget.id });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      toast.error(msg);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleArchive(ws: Workspace) {
    closeMenus();
    try {
      const { trashRetentionDays } = await archiveWorkspace(ws.id);
      toast.success('Workspace moved to Archive & delete', {
        description: trashRetentionArchiveSentence(trashRetentionDays),
      });
      if (activeWorkspaceId === ws.id) {
        setActiveWorkspace(null);
        navigate('/workspaces', { replace: true });
      }
      await refresh();
      telemetry.track('workspace.archived', { workspaceId: ws.id });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Archive failed';
      toast.error(msg);
    }
  }

  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (
      !authLoading &&
      user &&
      listedWorkspaces.length === 1 &&
      !activeWorkspaceId &&
      !hasInitializedRef.current
    ) {
      hasInitializedRef.current = true;
      const only = listedWorkspaces[0];
      if (only) {
        setActiveWorkspace(only.id);
        telemetry.track('workspace.selected', { workspaceId: only.id, reason: 'single_workspace' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listedWorkspaces.length, activeWorkspaceId, authLoading, user]);

  useEffect(() => {
    if (renameTarget) {
      setRenameDraft(renameTarget.name);
    }
  }, [renameTarget]);

  const moreWs = moreMenu ? listedWorkspaces.find((w) => w.id === moreMenu.wsId) : undefined;
  const plusWs = plusMenu ? listedWorkspaces.find((w) => w.id === plusMenu.wsId) : undefined;

  useEffect(() => {
    if (moreMenu && !moreWs) setMoreMenu(null);
  }, [moreMenu, moreWs]);

  useEffect(() => {
    if (plusMenu && !plusWs) setPlusMenu(null);
  }, [plusMenu, plusWs]);

  if (listedWorkspaces.length === 0 && !authLoading) {
    return (
      <div data-testid="sidebar-workspaces">
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

  return (
    <div ref={rootRef} className="mb-2 space-y-1" data-testid="sidebar-workspaces">
      {hoverActionTip && !moreMenu && !plusMenu
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg"
              style={{
                top: hoverActionTip.rect.top - 6,
                left: hoverActionTip.rect.left + hoverActionTip.rect.width / 2,
                transform: 'translate(-50%, -100%)',
                zIndex: ACTION_HOVER_TOOLTIP_Z,
              }}
            >
              {hoverActionTip.text}
            </div>,
            document.body,
          )
        : null}
      <div
        className="max-h-64 space-y-0.5 overflow-y-auto pr-0.5"
        data-testid="workspace-selector"
        role="list"
        aria-label="Workspaces"
      >
        {listedWorkspaces.map((ws) => {
          const isActive = ws.id === activeWorkspaceId;
          const fav = favoriteFor(ws.id);
          const letter = ws.name.trim().charAt(0).toUpperCase() || '?';
          const moreOpen = moreMenu?.wsId === ws.id;
          const plusOpen = plusMenu?.wsId === ws.id;
          const actionsVisible = moreOpen || plusOpen;

          return (
            <div
              key={ws.id}
              role="listitem"
              className={`group/ws-row flex items-center gap-0.5 rounded-lg px-1 py-0.5 transition ${
                isActive ? 'bg-blue-50 ring-1 ring-blue-100' : 'hover:bg-slate-50'
              }`}
            >
              <button
                type="button"
                onClick={() => handleWorkspaceSelect(ws.id)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm font-medium text-slate-800 transition"
                data-testid={`workspace-option-${ws.id}`}
                aria-current={isActive ? 'true' : undefined}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                  aria-hidden
                >
                  {letter}
                </span>
                <span className="min-w-0 flex-1 truncate">{ws.name}</span>
              </button>

              {!viewer && (
                <div
                  className={`flex shrink-0 items-center gap-0.5 transition-opacity duration-150 ${
                    actionsVisible
                      ? 'opacity-100'
                      : 'opacity-100 md:opacity-0 md:group-hover/ws-row:opacity-100 md:group-focus-within/ws-row:opacity-100'
                  }`}
                >
                  <div className="relative flex shrink-0 items-center">
                    <button
                      type="button"
                      title="Workspace settings"
                      onMouseEnter={(e) => {
                        if (moreMenu || plusMenu) return;
                        setHoverActionTip({
                          text: 'Workspace settings',
                          rect: e.currentTarget.getBoundingClientRect(),
                        });
                      }}
                      onMouseLeave={() => setHoverActionTip(null)}
                      onFocus={(e) => {
                        if (moreMenu || plusMenu) return;
                        setHoverActionTip({
                          text: 'Workspace settings',
                          rect: e.currentTarget.getBoundingClientRect(),
                        });
                      }}
                      onBlur={() => setHoverActionTip(null)}
                      onClick={(e) => {
                        setHoverActionTip(null);
                        const r = e.currentTarget.getBoundingClientRect();
                        setPlusMenu(null);
                        setMoreMenu((m) => (m?.wsId === ws.id ? null : { wsId: ws.id, rect: r }));
                      }}
                      className={`rounded p-0.5 text-slate-500 transition hover:bg-slate-200/80 ${
                        moreOpen ? 'bg-slate-200/80' : ''
                      }`}
                      data-testid={`workspace-row-more-${ws.id}`}
                      aria-expanded={moreOpen}
                      aria-haspopup="menu"
                      aria-label="Workspace settings"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="relative flex shrink-0 items-center">
                    <button
                      type="button"
                      title="Create new"
                      onMouseEnter={(e) => {
                        if (moreMenu || plusMenu) return;
                        setHoverActionTip({
                          text: 'Create new',
                          rect: e.currentTarget.getBoundingClientRect(),
                        });
                      }}
                      onMouseLeave={() => setHoverActionTip(null)}
                      onFocus={(e) => {
                        if (moreMenu || plusMenu) return;
                        setHoverActionTip({
                          text: 'Create new',
                          rect: e.currentTarget.getBoundingClientRect(),
                        });
                      }}
                      onBlur={() => setHoverActionTip(null)}
                      onClick={(e) => {
                        setHoverActionTip(null);
                        const r = e.currentTarget.getBoundingClientRect();
                        setMoreMenu(null);
                        setPlusMenu((m) => (m?.wsId === ws.id ? null : { wsId: ws.id, rect: r }));
                      }}
                      className={`rounded p-0.5 text-slate-500 transition hover:bg-slate-200/80 ${
                        plusOpen ? 'bg-slate-200/80' : ''
                      }`}
                      data-testid={`workspace-plus-button-${ws.id}`}
                      aria-expanded={plusOpen}
                      aria-haspopup="menu"
                      aria-label="Create new"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(moreMenu && moreWs) || (plusMenu && plusWs)
        ? createPortal(
            moreMenu && moreWs ? (
              <div
                ref={menuPanelRef}
                className="rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                style={fixedWorkspaceMenuStyle(moreMenu.rect)}
                role="menu"
                data-testid={`workspace-row-more-menu-${moreWs.id}`}
              >
                <SpaceMenuItem
                  icon={<Star />}
                  testId={`workspace-row-favorite-toggle-${moreWs.id}`}
                  onClick={() => {
                    const fav = favoriteFor(moreWs.id);
                    closeMenus();
                    if (fav) {
                      removeFavorite.mutate(
                        { itemType: 'workspace', itemId: moreWs.id },
                        { onError: () => toast.error('Could not update favorites') },
                      );
                    } else {
                      addFavorite.mutate(
                        { itemType: 'workspace', itemId: moreWs.id },
                        { onError: () => toast.error('Could not update favorites') },
                      );
                    }
                  }}
                >
                  {favoriteFor(moreWs.id) ? 'Remove from favorites' : 'Favorite'}
                </SpaceMenuItem>
                <SpaceMenuItem
                  icon={<Pencil />}
                  testId={`workspace-row-rename-${moreWs.id}`}
                  onClick={() => {
                    closeMenus();
                    setRenameTarget({ id: moreWs.id, name: moreWs.name });
                  }}
                >
                  Rename
                </SpaceMenuItem>
                <SpaceMenuItem
                  icon={<Link2 />}
                  testId={`workspace-row-copy-link-${moreWs.id}`}
                  onClick={() => void handleCopyLink(moreWs)}
                >
                  Copy link
                </SpaceMenuItem>
                <SpaceMenuItem
                  icon={<Copy />}
                  testId={`workspace-row-duplicate-${moreWs.id}`}
                  onClick={() => {
                    closeMenus();
                    toast.message('Duplicate workspace is not available yet.');
                  }}
                >
                  Duplicate
                </SpaceMenuItem>
                <SpaceMenuItem
                  icon={<Archive />}
                  testId={`workspace-row-archive-${moreWs.id}`}
                  onClick={() => void handleArchive(moreWs)}
                >
                  Archive
                </SpaceMenuItem>
                <SpaceMenuItem
                  icon={<Trash2 />}
                  testId={`workspace-row-delete-${moreWs.id}`}
                  danger
                  onClick={() => {
                    closeMenus();
                    setDeleteTarget({ id: moreWs.id, name: moreWs.name });
                  }}
                >
                  Delete
                </SpaceMenuItem>
                <SpaceMenuItem
                  icon={<Shield />}
                  testId={`workspace-row-permissions-${moreWs.id}`}
                  onClick={() => {
                    closeMenus();
                    setActiveWorkspace(moreWs.id);
                    navigate(`/workspaces/${moreWs.id}/settings?tab=members`);
                  }}
                >
                  Permission
                </SpaceMenuItem>
              </div>
            ) : plusMenu && plusWs ? (
              <div
                ref={menuPanelRef}
                className="rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                style={fixedWorkspaceMenuStyle(plusMenu.rect, Math.min(window.innerWidth - 16, 288))}
                role="menu"
                data-testid={`workspace-row-plus-menu-${plusWs.id}`}
              >
                <SpaceMenuItem
                  icon={<LayoutTemplate />}
                  testId={`workspace-plus-template-center-${plusWs.id}`}
                  onClick={() => {
                    closeMenus();
                    setActiveWorkspace(plusWs.id);
                    setTemplateCenterWsId(plusWs.id);
                  }}
                >
                  New from template
                </SpaceMenuItem>
                <SpaceMenuItem
                  icon={<FileText />}
                  testId={`workspace-plus-doc-${plusWs.id}`}
                  onClick={async () => {
                    closeMenus();
                    setActiveWorkspace(plusWs.id);
                    try {
                      const { createDoc } = await import('@/features/docs/api');
                      const docId = await createDoc(plusWs.id, 'Untitled');
                      navigate(`/docs/${docId}`, { replace: true });
                      toast.success('Doc created');
                    } catch (e: unknown) {
                      const msg = e instanceof Error ? e.message : 'Failed to create doc';
                      toast.error(msg);
                    }
                  }}
                >
                  Doc
                </SpaceMenuItem>
                <SpaceMenuItem
                  icon={<ShieldAlert />}
                  testId={`workspace-plus-raid-log-${plusWs.id}`}
                  onClick={async () => {
                    closeMenus();
                    setActiveWorkspace(plusWs.id);
                    try {
                      const { createDoc } = await import('@/features/docs/api');
                      const docId = await createDoc(plusWs.id, 'RAID log');
                      navigate(`/docs/${docId}`, { replace: true });
                      toast.success('RAID log created');
                    } catch (e: unknown) {
                      const msg = e instanceof Error ? e.message : 'Failed to create RAID log';
                      toast.error(msg);
                    }
                  }}
                >
                  RAID log
                </SpaceMenuItem>
                <SpaceMenuItem
                  icon={<BookOpen />}
                  testId={`workspace-plus-lesson-learned-${plusWs.id}`}
                  onClick={async () => {
                    closeMenus();
                    setActiveWorkspace(plusWs.id);
                    try {
                      const { createDoc } = await import('@/features/docs/api');
                      const docId = await createDoc(plusWs.id, 'Lesson learned');
                      navigate(`/docs/${docId}`, { replace: true });
                      toast.success('Lesson learned created');
                    } catch (e: unknown) {
                      const msg = e instanceof Error ? e.message : 'Failed to create lesson';
                      toast.error(msg);
                    }
                  }}
                >
                  Lesson learned
                </SpaceMenuItem>
              </div>
            ) : null,
            document.body,
          )
        : null}

      {canCreateWorkspace && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          data-testid="workspace-add-new"
        >
          <Plus className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          New workspace
        </button>
      )}

      {canCreateWorkspace && (
        <WorkspaceCreateModal
          open={open}
          onClose={() => setOpen(false)}
          onCreated={() => {
            refresh();
          }}
        />
      )}

      {renameTarget && (
        <div
          className="fixed inset-0 z-[200] grid place-items-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setRenameTarget(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
            role="dialog"
            aria-labelledby="ws-rename-title"
            data-testid="workspace-rename-dialog"
          >
            <h2 id="ws-rename-title" className="text-lg font-semibold text-slate-900">
              Rename workspace
            </h2>
            <label htmlFor="ws-rename-input" className="mt-3 block text-sm text-slate-600">
              Name
            </label>
            <input
              id="ws-rename-input"
              data-testid="workspace-rename-input"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                onClick={() => setRenameTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={renameBusy || !renameDraft.trim()}
                onClick={() => void submitRename()}
                data-testid="workspace-rename-save"
              >
                {renameBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[200] grid place-items-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
            role="alertdialog"
            aria-labelledby="ws-delete-title"
            data-testid="workspace-delete-dialog"
          >
            <h2 id="ws-delete-title" className="text-lg font-semibold text-red-700">
              Move workspace to Archive &amp; delete?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">{deleteTarget.name}</span> will be moved to
              Archive &amp; delete (soft remove). This may take a moment to sync across the app.
            </p>
            <p className="mt-2 text-xs text-slate-500">{trashRetentionDeleteSentence(PLATFORM_TRASH_RETENTION_DAYS)}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={deleteBusy}
                onClick={() => void submitDelete()}
                data-testid="workspace-delete-confirm"
              >
                {deleteBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Center Modal */}
      <TemplateCenterModal
        open={!!templateCenterWsId}
        onClose={() => setTemplateCenterWsId(null)}
        workspaceId={templateCenterWsId ?? ''}
      />
    </div>
  );
}
