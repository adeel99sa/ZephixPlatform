import { useEffect, useState, useRef, useMemo, useCallback, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Archive,
  BookmarkPlus,
  ChevronRight,
  Copy,
  FilePlus,
  FileText,
  FolderInput,
  LayoutTemplate,
  Link2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { AddWorkspaceMemberDialog } from './components/AddWorkspaceMemberDialog';
import { InviteProjectMemberDialog } from './components/InviteProjectMemberDialog';

import {
  listWorkspaces,
  renameWorkspace,
  deleteWorkspace,
  archiveWorkspace,
} from './api';
import type { Workspace } from './api';
import {
  listProjects,
  renameProject,
  deleteProject,
  restoreProject,
  moveProjectToWorkspace,
} from '@/features/projects/api';
import type { Project as SidebarProject } from '@/features/projects/types';
import { projectsApi } from '@/features/projects/projects.api';
import { WorkspaceCreateModal } from './WorkspaceCreateModal';
import { TemplateCenterModal } from '@/features/templates/components/TemplateCenterModal';
import { useQueryClient } from '@tanstack/react-query';
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
import { useEffectiveRole } from '@/utils/access/useEffectiveRole';
import { ArtifactTypePickerModal } from '@/features/artifacts/components/ArtifactTypePickerModal';
import { useTreeRovingKeydown } from '@/hooks/use-tree-roving-keydown';
import { useFavorites, useAddFavorite, useRemoveFavorite } from '@/features/favorites/hooks';
import { listProjectArtifacts } from '@/api/project-artifacts.api';
import type { ProjectArtifact } from '@/api/project-artifacts.types';
import { artifactTypeIcon, artifactTypeLabel } from '@/features/artifacts/constants/artifactTypes.constants';

function projectExpansionStorageKey(userId: string | undefined): string {
  return `zephix-sidebar-project-expansion-${userId ?? 'guest'}`;
}

function readExpandedProjectIds(storageKey: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeExpandedProjectIds(storageKey: string, map: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(map));
}

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
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { can } = useEffectiveRole();
  const canCreateArtifact = can('artifact.create');
  const onArtifactTreeKeyDown = useTreeRovingKeydown();
  const projectExpansionKey = useMemo(
    () => projectExpansionStorageKey(user?.id),
    [user?.id],
  );
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const workspacesDirectoryNonce = useWorkspaceStore((s) => s.workspacesDirectoryNonce);
  const sidebarWorkspacePlaceholder = useWorkspaceStore((s) => s.sidebarWorkspacePlaceholder);
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active context from the current route.
  const isOnWorkspacePage = location.pathname.startsWith('/workspaces/');
  const activeProjectId = location.pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;
  const activeArtifactId =
    location.pathname.match(/^\/projects\/[^/]+\/artifacts\/([^/]+)/)?.[1] ?? null;

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
  // MVP-3A Addendum: workspace-level add-member popup (replaces navigation to /members)
  const [addMemberTarget, setAddMemberTarget] = useState<{ id: string; name: string } | null>(null);
  // MVP-5: project-level invite dialog
  const [projectInviteTarget, setProjectInviteTarget] = useState<{
    workspaceId: string; workspaceName: string; projectId: string; projectName: string;
  } | null>(null);

  type ProjectMenuAnchor = { wsId: string; project: SidebarProject; rect: DOMRect };
  const [projectMoreMenu, setProjectMoreMenu] = useState<ProjectMenuAnchor | null>(null);
  const [projectRenameTarget, setProjectRenameTarget] = useState<{
    id: string;
    name: string;
    workspaceId: string;
  } | null>(null);
  const [projectRenameDraft, setProjectRenameDraft] = useState('');
  const [projectRenameBusy, setProjectRenameBusy] = useState(false);
  const [pendingArchiveProject, setPendingArchiveProject] = useState<{
    id: string;
    name: string;
    wsId: string;
  } | null>(null);
  const [projectDeleteBusy, setProjectDeleteBusy] = useState(false);
  const [projectMoveTarget, setProjectMoveTarget] = useState<{
    id: string;
    name: string;
    fromWorkspaceId: string;
  } | null>(null);
  const [projectMoveToId, setProjectMoveToId] = useState('');
  const [projectMoveBusy, setProjectMoveBusy] = useState(false);
  const [addArtifactTarget, setAddArtifactTarget] = useState<{
    wsId: string;
    projectId: string;
    projectName: string;
  } | null>(null);

  const projectMenuPanelRef = useRef<HTMLDivElement>(null);

  // Phase 4.7.1 — sidebar workspace tree state
  // Per-workspace expansion + cached project list. Fetched lazily on first
  // expand. We track loading + error per workspace so each row can show its
  // own state without blocking the rest of the list.
  //
  // IMPORTANT: on error we leave wsProjects[wsId] UNDEFINED. Setting it to []
  // would conflate "load failed" with "load returned zero" and make the
  // chevron disappear (knownEmpty would flip true). Errors keep the chevron
  // visible so the user can collapse and retry.
  const [expandedWs, setExpandedWs] = useState<Record<string, boolean>>({});
  const [wsProjects, setWsProjects] = useState<Record<string, SidebarProject[]>>({});
  const [wsProjectsLoading, setWsProjectsLoading] = useState<Record<string, boolean>>({});
  const [wsProjectsError, setWsProjectsError] = useState<Record<string, string | null>>({});

  // Sprint 5.2a — per-project artifact tree (project-only expansion in localStorage)
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>(
    () => readExpandedProjectIds(projectExpansionKey),
  );
  const [projectArtifacts, setProjectArtifacts] = useState<
    Record<string, ProjectArtifact[]>
  >({});
  const [projectArtifactsLoading, setProjectArtifactsLoading] = useState<
    Record<string, boolean>
  >({});
  const [projectArtifactsError, setProjectArtifactsError] = useState<
    Record<string, string | null>
  >({});

  const loadProjectArtifacts = useCallback(async (projectId: string) => {
    setProjectArtifactsLoading((m) => ({ ...m, [projectId]: true }));
    setProjectArtifactsError((m) => ({ ...m, [projectId]: null }));
    try {
      const artifacts = await listProjectArtifacts(projectId);
      setProjectArtifacts((m) => ({ ...m, [projectId]: artifacts }));
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { message?: string } } };
      const message =
        e?.response?.data?.message || e?.message || 'Failed to load artifacts';
      setProjectArtifactsError((m) => ({ ...m, [projectId]: message }));
    } finally {
      setProjectArtifactsLoading((m) => ({ ...m, [projectId]: false }));
    }
  }, []);

  const toggleProjectExpand = useCallback(
    (wsId: string, projectId: string) => {
      setExpandedProjects((prev) => {
        const next = { ...prev, [projectId]: !prev[projectId] };
        writeExpandedProjectIds(projectExpansionKey, next);
        if (next[projectId] && !projectArtifacts[projectId] && !projectArtifactsLoading[projectId]) {
          setActiveWorkspace(wsId);
          void loadProjectArtifacts(projectId);
        }
        return next;
      });
    },
    [
      projectArtifacts,
      projectArtifactsLoading,
      loadProjectArtifacts,
      setActiveWorkspace,
      projectExpansionKey,
    ],
  );

  useEffect(() => {
    setExpandedProjects(readExpandedProjectIds(projectExpansionKey));
  }, [projectExpansionKey]);

  const loadWorkspaceProjects = useCallback(async (wsId: string) => {
    setWsProjectsLoading((m) => ({ ...m, [wsId]: true }));
    setWsProjectsError((m) => ({ ...m, [wsId]: null }));
    try {
      // Phase 4.7.1: use the same listProjects helper that WorkspaceProjectsList
      // uses. It's the proven workspace-scoped fetch path.
      const projects = await listProjects(wsId);
      setWsProjects((m) => ({ ...m, [wsId]: projects ?? [] }));
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || 'Failed to load projects';
      setWsProjectsError((m) => ({ ...m, [wsId]: message }));
      // Do NOT cache an empty array on error — that would hide the chevron.
    } finally {
      setWsProjectsLoading((m) => ({ ...m, [wsId]: false }));
    }
  }, []);

  const toggleWorkspaceExpand = useCallback(
    (wsId: string) => {
      setExpandedWs((prev) => {
        const next = { ...prev, [wsId]: !prev[wsId] };
        // Load on first open if we don't already have a cached list.
        if (next[wsId] && !wsProjects[wsId] && !wsProjectsLoading[wsId]) {
          void loadWorkspaceProjects(wsId);
        }
        // Expanding a workspace also activates it — ensures RequireWorkspace
        // passes when the user clicks a child project.
        if (next[wsId]) {
          setActiveWorkspace(wsId);
        }
        return next;
      });
    },
    [wsProjects, wsProjectsLoading, loadWorkspaceProjects, setActiveWorkspace],
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  /** Portaled — avoids clipping by sidebar/nav overflow; centered above … / + */
  const [hoverActionTip, setHoverActionTip] = useState<{ text: string; rect: DOMRect } | null>(null);

  const { data: favorites } = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  const showArchivedWorkspaces = useSidebarWorkspacesUiStore((s) => s.showArchivedWorkspaces);

  /** Org platform ADMIN — create workspace, archive/delete workspace (server-enforced). */
  const canCreateWorkspace = canCreateOrgWorkspace(user);
  const viewer = isPlatformViewer(user);

  const closeMenus = useCallback(() => {
    setMoreMenu(null);
    setPlusMenu(null);
    setProjectMoreMenu(null);
  }, []);

  // Phase 5B.1A defect fix: when a project is created elsewhere in the app
  // (e.g. Template Center), refetch the project list for any expanded
  // workspace tree node so the new project shows up without a full reload.
  // Also bumps the React Query 'projects' cache for any dashboards listening.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { workspaceId?: string } | undefined;
      const wsId = detail?.workspaceId;
      if (wsId && expandedWs[wsId]) {
        void loadWorkspaceProjects(wsId);
      } else {
        // Unknown workspace — refresh every currently-expanded one to be safe.
        for (const id of Object.keys(expandedWs)) {
          if (expandedWs[id]) void loadWorkspaceProjects(id);
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    };
    window.addEventListener('zephix:projects:invalidate', handler);
    return () => window.removeEventListener('zephix:projects:invalidate', handler);
  }, [expandedWs, loadWorkspaceProjects, queryClient]);

  useEffect(() => {
    if (!moreMenu && !plusMenu && !projectMoreMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (menuPanelRef.current?.contains(t)) return;
      if (projectMenuPanelRef.current?.contains(t)) return;
      closeMenus();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreMenu, plusMenu, projectMoreMenu, closeMenus]);

  useEffect(() => {
    if (!moreMenu && !plusMenu && !projectMoreMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreMenu, plusMenu, projectMoreMenu, closeMenus]);

  useEffect(() => {
    if (!moreMenu && !plusMenu && !projectMoreMenu) return;
    const onScroll = () => closeMenus();
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [moreMenu, plusMenu, projectMoreMenu, closeMenus]);

  useEffect(() => {
    if (!moreMenu && !plusMenu && !projectMoreMenu) return;
    const onResize = () => closeMenus();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [moreMenu, plusMenu, projectMoreMenu, closeMenus]);

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

  const favoriteForProject = useCallback(
    (projectId: string) => favorites?.find((f) => f.itemType === 'project' && f.itemId === projectId),
    [favorites],
  );

  function workspaceHomeUrl(wsId: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/workspaces/${wsId}/home`;
  }

  function projectOverviewUrl(projectId: string) {
    // Step 1 route contract fix: see comment on the project row onClick
    // below. The router has no `/overview` child route. The "Copy project
    // link" helper must produce a URL that React Router will actually
    // resolve — the bare `/projects/:id` index route.
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/projects/${projectId}`;
  }

  async function handleCopyProjectLink(projectId: string) {
    closeMenus();
    const url = projectOverviewUrl(projectId);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
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
      void queryClient.invalidateQueries({ queryKey: ['favorites'] });
      telemetry.track('workspace.deleted', { workspaceId: deleteTarget.id });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      toast.error(msg);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleArchiveProject(projectId: string, workspaceId: string) {
    closeMenus();
    try {
      const { trashRetentionDays } = await projectsApi.archiveProject(projectId);
      toast.success('Project moved to Archive & delete', {
        description: trashRetentionArchiveSentence(trashRetentionDays),
      });
      setWsProjects((m) => {
        const next = { ...m };
        delete next[workspaceId];
        return next;
      });
      void loadWorkspaceProjects(workspaceId);
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['favorites'] });
      telemetry.track('project.archived', { projectId });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Archive failed';
      toast.error(msg);
    }
  }

  async function submitProjectRename() {
    if (!projectRenameTarget || !projectRenameDraft.trim()) return;
    const { id: renameId, workspaceId: renameWsId } = projectRenameTarget;
    setProjectRenameBusy(true);
    try {
      await renameProject(renameId, projectRenameDraft.trim());
      toast.success('Project renamed');
      setProjectRenameTarget(null);
      void loadWorkspaceProjects(renameWsId);
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      telemetry.track('project.renamed', { projectId: renameId });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Rename failed';
      toast.error(msg);
    } finally {
      setProjectRenameBusy(false);
    }
  }

  async function submitProjectDelete(target: {
    id: string;
    name: string;
    workspaceId: string;
  }) {
    const { id: deleteId, workspaceId: deleteWsId } = target;
    setProjectDeleteBusy(true);
    try {
      await deleteProject(deleteId);
      void loadWorkspaceProjects(deleteWsId);
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['favorites'] });
      telemetry.track('project.deleted', { projectId: deleteId });
      toast.success('Project deleted. Restore it from Trash if needed.', {
        duration: 30_000,
        description: 'Tip: Click Undo above within 30 seconds',
        action: {
          label: 'Undo',
          onClick: () => {
            void (async () => {
              try {
                await restoreProject(deleteId);
                toast.success('Project restored');
                void loadWorkspaceProjects(deleteWsId);
                void queryClient.invalidateQueries({ queryKey: ['projects'] });
                void queryClient.invalidateQueries({ queryKey: ['favorites'] });
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Failed to restore project';
                toast.error(msg);
              }
            })();
          },
        },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      toast.error(msg);
    } finally {
      setProjectDeleteBusy(false);
    }
  }

  async function submitProjectMove() {
    if (!projectMoveTarget || !projectMoveToId || projectMoveToId === projectMoveTarget.fromWorkspaceId) {
      return;
    }
    const { id: movePid, fromWorkspaceId: moveFromWs } = projectMoveTarget;
    const moveToWs = projectMoveToId;
    setProjectMoveBusy(true);
    try {
      await moveProjectToWorkspace(movePid, moveToWs);
      const toName = listedWorkspaces.find((w) => w.id === moveToWs)?.name ?? 'workspace';
      toast.success(`Project moved to ${toName}`);
      setProjectMoveTarget(null);
      setProjectMoveToId('');
      setWsProjects((m) => {
        const next = { ...m };
        delete next[moveFromWs];
        delete next[moveToWs];
        return next;
      });
      void loadWorkspaceProjects(moveFromWs);
      void loadWorkspaceProjects(moveToWs);
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      telemetry.track('project.moved_workspace', { projectId: movePid });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Move failed';
      toast.error(msg);
    } finally {
      setProjectMoveBusy(false);
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
      void queryClient.invalidateQueries({ queryKey: ['favorites'] });
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

  useEffect(() => {
    if (projectRenameTarget) {
      setProjectRenameDraft(projectRenameTarget.name);
    }
  }, [projectRenameTarget]);

  useEffect(() => {
    if (!projectMoveTarget) {
      setProjectMoveToId('');
      return;
    }
    const firstOther = listedWorkspaces.find(
      (w) => w.id !== projectMoveTarget.fromWorkspaceId && !w.deletedAt,
    );
    setProjectMoveToId(firstOther?.id ?? '');
  }, [projectMoveTarget, listedWorkspaces]);

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
      {hoverActionTip && !moreMenu && !plusMenu && !projectMoreMenu
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
          // Workspace is "active" only when the user is viewing its home
          // page OR a project that belongs to it — not when on Inbox, My Work, etc.
          const projectsInWs = wsProjects[ws.id];
          const hasActiveProject = activeProjectId != null
            && Array.isArray(projectsInWs)
            && projectsInWs.some((p: any) => p.id === activeProjectId);
          const isActive =
            ws.id === activeWorkspaceId && (isOnWorkspacePage || hasActiveProject);
          const fav = favoriteFor(ws.id);
          const letter = ws.name.trim().charAt(0).toUpperCase() || '?';
          const moreOpen = moreMenu?.wsId === ws.id;
          const plusOpen = plusMenu?.wsId === ws.id;
          const actionsVisible = moreOpen || plusOpen;

          // Phase 4.7.1 — workspace tree expansion
          const isExpanded = !!expandedWs[ws.id];
          const childrenLoaded = wsProjects[ws.id];
          const childrenLoading = !!wsProjectsLoading[ws.id];
          const childrenError = wsProjectsError[ws.id] ?? null;
          // Chevron is always visible — expand/collapse is a UI control,
          // not a data indicator. Empty workspaces still need to collapse.
          const chevronVisible = true;

          return (
            <div key={ws.id} className="flex flex-col">
            <div
              role="listitem"
              className={`group/ws-row flex items-center gap-0.5 rounded-lg px-1 py-0.5 transition ${
                isActive ? 'bg-blue-50 ring-1 ring-blue-100' : 'hover:bg-slate-50'
              }`}
            >
              {/*
                Phase 4.7.1 — expand/collapse chevron.
                Matches the section-header pattern (Workspaces / Dashboards):
                chevron sits at the LEFT, before the workspace icon.
                - Click toggles tree only; never navigates.
                - Hidden when we know the workspace has no child projects.
                - Renders an empty placeholder when hidden so the icon column
                  stays aligned across rows.
              */}
              {chevronVisible ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWorkspaceExpand(ws.id);
                  }}
                  className="shrink-0 rounded p-0.5 text-slate-500 transition hover:bg-slate-200/80"
                  data-testid={`workspace-row-expand-${ws.id}`}
                  aria-expanded={isExpanded}
                  aria-controls={`workspace-children-${ws.id}`}
                  aria-label={isExpanded ? `Collapse ${ws.name}` : `Expand ${ws.name}`}
                >
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>
              ) : (
                <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
              )}

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
                      onMouseEnter={(e) => {
                        if (moreMenu || plusMenu || projectMoreMenu) return;
                        setHoverActionTip({
                          text: 'Workspace settings',
                          rect: e.currentTarget.getBoundingClientRect(),
                        });
                      }}
                      onMouseLeave={() => setHoverActionTip(null)}
                      onFocus={(e) => {
                        if (moreMenu || plusMenu || projectMoreMenu) return;
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
                        setProjectMoreMenu(null);
                        setMoreMenu((m) => (m?.wsId === ws.id ? null : { wsId: ws.id, rect: r }));
                      }}
                      className={`rounded p-0.5 text-slate-500 transition hover:bg-slate-200/80 ${
                        moreOpen ? 'bg-slate-200/80' : ''
                      }`}
                      data-testid={`workspace-row-more-${ws.id}`}
                      aria-expanded={moreOpen}
                      aria-haspopup="menu"
                      aria-label="Workspace settings"
                      title="Workspace settings"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="relative flex shrink-0 items-center">
                    <button
                      type="button"
                      onMouseEnter={(e) => {
                        if (moreMenu || plusMenu || projectMoreMenu) return;
                        setHoverActionTip({
                          text: 'Create new',
                          rect: e.currentTarget.getBoundingClientRect(),
                        });
                      }}
                      onMouseLeave={() => setHoverActionTip(null)}
                      onFocus={(e) => {
                        if (moreMenu || plusMenu || projectMoreMenu) return;
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
                        setProjectMoreMenu(null);
                        setPlusMenu((m) => (m?.wsId === ws.id ? null : { wsId: ws.id, rect: r }));
                      }}
                      className={`rounded p-0.5 text-slate-500 transition hover:bg-slate-200/80 ${
                        plusOpen ? 'bg-slate-200/80' : ''
                      }`}
                      data-testid={`workspace-plus-button-${ws.id}`}
                      aria-expanded={plusOpen}
                      aria-haspopup="menu"
                      aria-label="Create new project or document"
                      title="Create new project or document"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Phase 4.7.1 — child project list */}
            {isExpanded && (
              <div
                id={`workspace-children-${ws.id}`}
                data-testid={`workspace-children-${ws.id}`}
                role="group"
                className="ml-9 mt-0.5 mb-1 space-y-0.5"
              >
                {childrenLoading && (
                  <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading projects…
                  </div>
                )}
                {childrenError && !childrenLoading && (
                  <div className="flex items-center gap-2 px-2 py-1 text-xs text-red-600">
                    <span className="min-w-0 flex-1 truncate">{childrenError}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void loadWorkspaceProjects(ws.id);
                      }}
                      className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-50"
                      data-testid={`workspace-children-retry-${ws.id}`}
                    >
                      Retry
                    </button>
                  </div>
                )}
                {!childrenLoading && !childrenError && childrenLoaded && childrenLoaded.length > 0 && (
                  childrenLoaded.map((p) => {
                    // Phase 4.7.2 — child label truthfulness lock.
                    // Only the real backend project name is rendered. If a
                    // project genuinely has no title (data corruption / WIP
                    // record), we fall back to "Untitled project" as the
                    // last-resort label. We NEVER fall back to "Projects"
                    // or any other section header — those are nav-level
                    // concepts and must not appear inside a workspace tree.
                    const realName =
                      typeof p.name === 'string' && p.name.trim().length > 0
                        ? p.name.trim()
                        : 'Untitled project';
                    const projectMenuOpen =
                      projectMoreMenu?.project.id === p.id && projectMoreMenu.wsId === ws.id;
                    const isProjectActive =
                      activeProjectId === p.id && !activeArtifactId;
                    const isProjectExpanded = !!expandedProjects[p.id];
                    const artifactsLoaded = projectArtifacts[p.id];
                    const artifactsLoading = !!projectArtifactsLoading[p.id];
                    const artifactsError = projectArtifactsError[p.id] ?? null;
                    return (
                      <div key={p.id} className="flex flex-col">
                        <div
                          className={`group/proj-row flex w-full min-w-0 items-center gap-0.5 rounded-md pr-0.5 transition ${
                            isProjectActive
                              ? 'bg-blue-50'
                              : projectMenuOpen
                                ? 'bg-slate-100'
                                : 'hover:bg-slate-100'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProjectExpand(ws.id, p.id);
                            }}
                            className="shrink-0 rounded p-0.5 text-slate-500 transition hover:bg-slate-200/80"
                            data-testid={`sidebar-project-expand-${p.id}`}
                            aria-expanded={isProjectExpanded}
                            aria-controls={`project-artifacts-${p.id}`}
                            aria-label={
                              isProjectExpanded ? `Collapse ${realName}` : `Expand ${realName}`
                            }
                          >
                            <ChevronRight
                              className={`h-3 w-3 transition-transform ${
                                isProjectExpanded ? 'rotate-90' : ''
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveWorkspace(ws.id);
                              navigate(`/projects/${p.id}`);
                            }}
                            className={`flex min-w-0 flex-1 items-center gap-2 truncate rounded-md px-2 py-1 text-left text-xs transition ${
                              isProjectActive ? 'font-medium text-blue-700' : 'text-slate-600'
                            }`}
                            data-testid={`workspace-child-project-${p.id}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                isProjectActive ? 'bg-blue-500' : 'bg-slate-300'
                              }`}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate">{realName}</span>
                          </button>
                          {!viewer && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setMoreMenu(null);
                                setPlusMenu(null);
                                const r = e.currentTarget.getBoundingClientRect();
                                setProjectMoreMenu((cur) =>
                                  cur?.project.id === p.id && cur.wsId === ws.id
                                    ? null
                                    : { wsId: ws.id, project: p, rect: r },
                                );
                              }}
                              className={`shrink-0 rounded p-0.5 text-slate-500 transition hover:bg-slate-200/80 ${
                                projectMenuOpen
                                  ? 'bg-slate-200/80 opacity-100'
                                  : 'opacity-100 md:opacity-0 md:group-hover/proj-row:opacity-100 md:group-focus-within/proj-row:opacity-100'
                              }`}
                              aria-label="Project actions"
                              title="Project actions"
                              aria-expanded={projectMenuOpen}
                              aria-haspopup="menu"
                              data-testid={`sidebar-project-more-${p.id}`}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        {isProjectExpanded && (
                          <div
                            id={`project-artifacts-${p.id}`}
                            role="tree"
                            aria-label={`Artifacts in ${realName}`}
                            className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-100 pl-2"
                            data-testid={`sidebar-project-artifacts-${p.id}`}
                            onKeyDown={onArtifactTreeKeyDown}
                          >
                            {artifactsLoading && (
                              <div className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-500">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading…
                              </div>
                            )}
                            {artifactsError && !artifactsLoading && (
                              <div className="px-2 py-1 text-[11px] text-red-600">{artifactsError}</div>
                            )}
                            {!artifactsLoading &&
                              !artifactsError &&
                              artifactsLoaded &&
                              artifactsLoaded.length === 0 && (
                                <p className="px-2 py-1 text-[11px] text-slate-400">
                                  No artifacts yet
                                </p>
                              )}
                            {!artifactsLoading &&
                              !artifactsError &&
                              artifactsLoaded &&
                              artifactsLoaded.map((art) => {
                                const Icon = artifactTypeIcon(art.type);
                                const isArtActive = activeArtifactId === art.id;
                                return (
                                  <button
                                    key={art.id}
                                    type="button"
                                    role="treeitem"
                                    aria-level={2}
                                    aria-selected={isArtActive}
                                    tabIndex={isArtActive ? 0 : -1}
                                    onClick={() => {
                                      setActiveWorkspace(ws.id);
                                      navigate(`/projects/${p.id}/artifacts/${art.id}`);
                                    }}
                                    className={`flex w-full min-w-0 items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] transition ${
                                      isArtActive
                                        ? 'bg-blue-50 font-medium text-blue-800'
                                        : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    data-testid={`sidebar-artifact-${art.id}`}
                                  >
                                    <Icon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                                    <span className="min-w-0 flex-1 truncate">{art.name}</span>
                                    <span className="shrink-0 text-slate-400" aria-hidden>
                                      {artifactTypeLabel(art.type)}
                                    </span>
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                {!childrenLoading && !childrenError && childrenLoaded && childrenLoaded.length === 0 && (
                  // Phase 4.7.2 sidebar freeze addendum (rule 5):
                  // A muted empty-state hint is allowed, but it must never
                  // look or behave like a clickable project row. Plain
                  // <div>, no onClick, no role, muted color.
                  <div
                    className="px-2 py-1 text-xs text-slate-400"
                    data-testid={`workspace-children-empty-${ws.id}`}
                  >
                    No projects yet
                  </div>
                )}
              </div>
            )}
            </div>
          );
        })}
      </div>

      {(moreMenu && moreWs) || (plusMenu && plusWs) || projectMoreMenu
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
                {canCreateWorkspace ? (
                  <>
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
                  </>
                ) : null}
                <SpaceMenuItem
                  icon={<Users />}
                  testId={`workspace-row-invite-${moreWs.id}`}
                  onClick={() => {
                    closeMenus();
                    setAddMemberTarget({ id: moreWs.id, name: moreWs.name });
                  }}
                >
                  Invite members
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
                <button
                  type="button"
                  role="menuitem"
                  title="New Project"
                  data-testid={`workspace-plus-new-project-${plusWs.id}`}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                  onClick={() => {
                    closeMenus();
                    setActiveWorkspace(plusWs.id);
                    setTemplateCenterWsId(plusWs.id);
                  }}
                >
                  <LayoutTemplate className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  New Project
                </button>
                <SpaceMenuItem
                  icon={<FileText />}
                  testId={`workspace-plus-new-document-${plusWs.id}`}
                  onClick={async () => {
                    closeMenus();
                    setActiveWorkspace(plusWs.id);
                    try {
                      const { createDoc } = await import('@/features/docs/api');
                      const docId = await createDoc(plusWs.id, 'Untitled');
                      navigate(`/docs/${docId}`, { replace: true });
                      toast.success('Document created');
                    } catch (e: unknown) {
                      const msg = e instanceof Error ? e.message : 'Failed to create document';
                      toast.error(msg);
                    }
                  }}
                >
                  New Document
                </SpaceMenuItem>
                <SpaceMenuItem
                  icon={<LayoutTemplate />}
                  testId={`workspace-plus-from-template-${plusWs.id}`}
                  onClick={() => {
                    closeMenus();
                    setActiveWorkspace(plusWs.id);
                    setTemplateCenterWsId(plusWs.id);
                  }}
                >
                  From Template
                </SpaceMenuItem>
                <div
                  role="menuitem"
                  title="Import — Coming Q3"
                  data-testid={`workspace-plus-import-${plusWs.id}`}
                  className="flex w-full cursor-not-allowed items-center justify-between gap-2 px-3 py-2 text-sm text-slate-400"
                  aria-disabled
                >
                  <span className="flex items-center gap-3">
                    <FileText className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                    Import
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Coming Q3
                  </span>
                </div>
              </div>
            ) : projectMoreMenu ? (
              <div
                ref={projectMenuPanelRef}
                className="rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                style={fixedWorkspaceMenuStyle(projectMoreMenu.rect)}
                role="menu"
                data-testid={`sidebar-project-more-menu-${projectMoreMenu.project.id}`}
              >
                {(() => {
                  const pm = projectMoreMenu;
                  const canMoveElsewhere = listedWorkspaces.some(
                    (w) => w.id !== pm.wsId && !w.deletedAt,
                  );
                  return (
                    <>
                      <SpaceMenuItem
                        icon={<Star />}
                        testId={`sidebar-project-favorite-${pm.project.id}`}
                        onClick={() => {
                          const fav = favoriteForProject(pm.project.id);
                          closeMenus();
                          if (fav) {
                            removeFavorite.mutate(
                              { itemType: 'project', itemId: pm.project.id },
                              { onError: () => toast.error('Could not update favorites') },
                            );
                          } else {
                            addFavorite.mutate(
                              { itemType: 'project', itemId: pm.project.id },
                              { onError: () => toast.error('Could not update favorites') },
                            );
                          }
                        }}
                      >
                        {favoriteForProject(pm.project.id) ? 'Remove from favorites' : 'Favorite'}
                      </SpaceMenuItem>
                      <SpaceMenuItem
                        icon={<Pencil />}
                        testId={`sidebar-project-rename-${pm.project.id}`}
                        onClick={() => {
                          closeMenus();
                          setProjectRenameTarget({
                            id: pm.project.id,
                            name: pm.project.name,
                            workspaceId: pm.wsId,
                          });
                        }}
                      >
                        Rename
                      </SpaceMenuItem>
                      <SpaceMenuItem
                        icon={<UserPlus />}
                        testId={`sidebar-project-invite-${pm.project.id}`}
                        onClick={() => {
                          closeMenus();
                          const ws = workspaces.find((w) => w.id === pm.wsId);
                          setProjectInviteTarget({
                            workspaceId: pm.wsId,
                            workspaceName: ws?.name ?? 'Workspace',
                            projectId: pm.project.id,
                            projectName: pm.project.name,
                          });
                        }}
                      >
                        Invite member
                      </SpaceMenuItem>
                      <SpaceMenuItem
                        icon={<Link2 />}
                        testId={`sidebar-project-copy-link-${pm.project.id}`}
                        onClick={() => void handleCopyProjectLink(pm.project.id)}
                      >
                        Copy link
                      </SpaceMenuItem>
                      <div className="my-1 border-t border-slate-100" />
                      <SpaceMenuItem
                        icon={<Copy />}
                        testId={`sidebar-project-duplicate-${pm.project.id}`}
                        onClick={() => {
                          closeMenus();
                          const base = location.pathname.startsWith(`/projects/${pm.project.id}`)
                            ? location.pathname
                            : `/projects/${pm.project.id}`;
                          navigate(`${base}?action=duplicate`);
                        }}
                      >
                        Duplicate
                      </SpaceMenuItem>
                      <SpaceMenuItem
                        icon={<BookmarkPlus />}
                        testId={`sidebar-project-save-template-${pm.project.id}`}
                        onClick={() => {
                          closeMenus();
                          const base = location.pathname.startsWith(`/projects/${pm.project.id}`)
                            ? location.pathname
                            : `/projects/${pm.project.id}`;
                          navigate(`${base}?action=save-as-template`);
                        }}
                      >
                        Save as template
                      </SpaceMenuItem>
                      {canMoveElsewhere ? (
                        <SpaceMenuItem
                          icon={<FolderInput />}
                          testId={`sidebar-project-move-${pm.project.id}`}
                          onClick={() => {
                            closeMenus();
                            setProjectMoveTarget({
                              id: pm.project.id,
                              name: pm.project.name,
                              fromWorkspaceId: pm.wsId,
                            });
                          }}
                        >
                          Move…
                        </SpaceMenuItem>
                      ) : null}
                      {canCreateArtifact ? (
                        <SpaceMenuItem
                          icon={<FilePlus />}
                          testId={`sidebar-project-add-artifact-${pm.project.id}`}
                          onClick={() => {
                            closeMenus();
                            setActiveWorkspace(pm.wsId);
                            setAddArtifactTarget({
                              wsId: pm.wsId,
                              projectId: pm.project.id,
                              projectName: pm.project.name,
                            });
                          }}
                        >
                          Add artifact
                        </SpaceMenuItem>
                      ) : null}
                      <div className="my-1 border-t border-slate-100" />
                      <SpaceMenuItem
                        icon={<Archive />}
                        testId={`sidebar-project-archive-${pm.project.id}`}
                        onClick={() => {
                          closeMenus();
                          setPendingArchiveProject({
                            id: pm.project.id,
                            name: pm.project.name,
                            wsId: pm.wsId,
                          });
                        }}
                      >
                        Archive
                      </SpaceMenuItem>
                      <SpaceMenuItem
                        icon={<Trash2 />}
                        testId={`sidebar-project-delete-${pm.project.id}`}
                        danger
                        onClick={() => {
                          closeMenus();
                          void submitProjectDelete({
                            id: pm.project.id,
                            name: pm.project.name,
                            workspaceId: pm.wsId,
                          });
                        }}
                      >
                        Delete
                      </SpaceMenuItem>
                    </>
                  );
                })()}
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

      {addArtifactTarget ? (
        <ArtifactTypePickerModal
          open
          projectId={addArtifactTarget.projectId}
          projectName={addArtifactTarget.projectName}
          onClose={() => setAddArtifactTarget(null)}
          onCreated={() => {
            void loadProjectArtifacts(addArtifactTarget.projectId);
            setExpandedProjects((prev) => ({ ...prev, [addArtifactTarget.projectId]: true }));
          }}
        />
      ) : null}

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

      {projectRenameTarget && (
        <div
          className="fixed inset-0 z-[200] grid place-items-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setProjectRenameTarget(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
            role="dialog"
            aria-labelledby="proj-rename-title"
            data-testid="project-rename-dialog"
          >
            <h2 id="proj-rename-title" className="text-lg font-semibold text-slate-900">
              Rename project
            </h2>
            <label htmlFor="proj-rename-input" className="mt-3 block text-sm text-slate-600">
              Name
            </label>
            <input
              id="proj-rename-input"
              data-testid="project-rename-input"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={projectRenameDraft}
              onChange={(e) => setProjectRenameDraft(e.target.value)}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                onClick={() => setProjectRenameTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={projectRenameBusy || !projectRenameDraft.trim()}
                onClick={() => void submitProjectRename()}
                data-testid="project-rename-save"
              >
                {projectRenameBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingArchiveProject && (
        <div
          className="fixed inset-0 z-[200] grid place-items-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPendingArchiveProject(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
            role="alertdialog"
            aria-labelledby="proj-archive-title"
            data-testid="project-archive-dialog"
          >
            <h2 id="proj-archive-title" className="text-lg font-semibold text-slate-900">
              Archive this project?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This project will be removed from your workspace. You can restore it from Settings →
              Trash.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                onClick={() => setPendingArchiveProject(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700"
                onClick={() => {
                  const pending = pendingArchiveProject;
                  setPendingArchiveProject(null);
                  if (pending) {
                    void handleArchiveProject(pending.id, pending.wsId);
                  }
                }}
                data-testid="project-archive-confirm"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {projectMoveTarget && (
        <div
          className="fixed inset-0 z-[200] grid place-items-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setProjectMoveTarget(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
            role="dialog"
            aria-labelledby="proj-move-title"
            data-testid="project-move-dialog"
          >
            <h2 id="proj-move-title" className="text-lg font-semibold text-slate-900">
              Move project
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Move <span className="font-medium text-slate-800">{projectMoveTarget.name}</span> to
              another workspace.
            </p>
            <label htmlFor="proj-move-ws" className="mt-4 block text-sm text-slate-600">
              Destination workspace
            </label>
            <select
              id="proj-move-ws"
              data-testid="project-move-workspace-select"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={projectMoveToId}
              onChange={(e) => setProjectMoveToId(e.target.value)}
            >
              <option value="">Select workspace…</option>
              {listedWorkspaces
                .filter((w) => w.id !== projectMoveTarget.fromWorkspaceId && !w.deletedAt)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                onClick={() => setProjectMoveTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={
                  projectMoveBusy || !projectMoveToId || projectMoveToId === projectMoveTarget.fromWorkspaceId
                }
                onClick={() => void submitProjectMove()}
                data-testid="project-move-confirm"
              >
                {projectMoveBusy ? 'Moving…' : 'Move'}
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

      {/* MVP-3A Addendum: workspace add-member popup */}
      {createPortal(
        <AddWorkspaceMemberDialog
          isOpen={!!addMemberTarget}
          onClose={() => setAddMemberTarget(null)}
          workspaceId={addMemberTarget?.id ?? ''}
          workspaceName={addMemberTarget?.name ?? ''}
        />,
        document.body,
      )}

      {/* MVP-5: project-level invite member popup */}
      {createPortal(
        <InviteProjectMemberDialog
          isOpen={!!projectInviteTarget}
          onClose={() => setProjectInviteTarget(null)}
          workspaceId={projectInviteTarget?.workspaceId ?? ''}
          workspaceName={projectInviteTarget?.workspaceName ?? ''}
          projectId={projectInviteTarget?.projectId ?? ''}
          projectName={projectInviteTarget?.projectName ?? ''}
        />,
        document.body,
      )}
    </div>
  );
}
