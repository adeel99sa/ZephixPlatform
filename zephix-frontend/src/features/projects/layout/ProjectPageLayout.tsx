/**
 * ProjectPageLayout
 *
 * Shared layout wrapper for all project pages providing:
 * - Breadcrumb navigation (Workspace > {Project Name} when workspace is known)
 * - Tab navigation (Overview, Plan, Tasks, Risks, Resources)
 * - Loading and error states
 * - Consistent spacing and structure
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Folder, LayoutDashboard, ListTodo, AlertTriangle, Users, LayoutGrid, Table2, BarChart3, GitPullRequest, FileText, DollarSign, Activity } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { getWorkspace } from '@/features/workspaces/api';
// useProjectPermissions moved to toolbar ... menu (ProjectTasksTab)
import { projectsApi, type ProjectDetail } from '../projects.api';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { SaveAsTemplateModal } from '../components/SaveAsTemplateModal';
import { DuplicateProjectModal } from '../components/DuplicateProjectModal';
import { ProjectIdentityFrame } from '../components/ProjectIdentityFrame';
import { api } from '@/lib/api';
import {
  normalizeProjectOverview,
  type ProjectOverview,
} from '../model/projectOverview';

/**
 * Tab configuration for project pages
 *
 * HR3 (Template Center MVP source of truth): Only 4 tabs are visible in MVP project shell.
 * Other tab routes remain registered in App.tsx for direct URL access, but the visible
 * tab rail is limited to the approved MVP set: Overview, Activities, Board, Gantt.
 *
 * Phase 2 will rename "Tasks" → "Activities" and build the real Activities surface.
 * For Phase 1, "Tasks" is the closest existing tab to "Activities".
 */
const PROJECT_TABS_ALL = [
  { id: 'overview', label: 'Overview', path: '', icon: LayoutDashboard },
  { id: 'plan', label: 'Plan', path: '/plan', icon: Folder },
  { id: 'tasks', label: 'Activities', path: '/tasks', icon: ListTodo },
  { id: 'board', label: 'Board', path: '/board', icon: LayoutGrid },
  { id: 'table', label: 'Table', path: '/table', icon: Table2 },
  { id: 'gantt', label: 'Gantt', path: '/gantt', icon: BarChart3 },
  { id: 'risks', label: 'Risks', path: '/risks', icon: AlertTriangle },
  { id: 'resources', label: 'Resources', path: '/resources', icon: Users },
  { id: 'change-requests', label: 'Change Requests', path: '/change-requests', icon: GitPullRequest },
  { id: 'documents', label: 'Documents', path: '/documents', icon: FileText },
  { id: 'budget', label: 'Budget', path: '/budget', icon: DollarSign },
  { id: 'kpis', label: 'KPIs', path: '/kpis', icon: Activity },
] as const;

/** MVP visible tabs (HR3) */
const MVP_VISIBLE_TAB_IDS = new Set(['overview', 'tasks', 'board', 'gantt']);
const PROJECT_TABS = PROJECT_TABS_ALL.filter((t) => MVP_VISIBLE_TAB_IDS.has(t.id));

type TabId = typeof PROJECT_TABS[number]['id'];

interface ProjectContextValue {
  project: ProjectDetail | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Resolved display name for the project's workspace (null if fetch failed). */
  workspaceDisplayName: string | null;
  /** Overview payload for identity frame + Overview tab (single fetch path). */
  overviewSnapshot: ProjectOverview | null;
  overviewLoading: boolean;
  refreshOverviewSnapshot: () => Promise<void>;
  /** Open the Save-as-Template modal from any child (e.g. toolbar ... menu). */
  openSaveAsTemplate: () => void;
  /** Open the Duplicate Project modal from any child. */
  openDuplicateProject: () => void;
}

// Context to share project data with child routes
export const ProjectContext = React.createContext<ProjectContextValue>({
  project: null,
  loading: true,
  error: null,
  refresh: async () => {},
  workspaceDisplayName: null,
  overviewSnapshot: null,
  overviewLoading: false,
  refreshOverviewSnapshot: async () => {},
  openSaveAsTemplate: () => {},
  openDuplicateProject: () => {},
});

export function useProjectContext() {
  return React.useContext(ProjectContext);
}

export const ProjectPageLayout: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceDisplayName, setWorkspaceDisplayName] = useState<string | null>(null);
  const [overviewSnapshot, setOverviewSnapshot] = useState<ProjectOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const projectWorkspaceRef = useRef<string | null>(null);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [showDuplicateProject, setShowDuplicateProject] = useState(false);

  // Deep-link: ?action=save-as-template or ?action=duplicate opens the modal on arrival.
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const action = sp.get('action');
    if (!action) return;
    if (action === 'save-as-template') setShowSaveAsTemplate(true);
    if (action === 'duplicate') setShowDuplicateProject(true);
    sp.delete('action');
    const next = sp.toString();
    navigate({ pathname: location.pathname, search: next ? `?${next}` : '' }, { replace: true });
  }, [location.search, location.pathname, navigate]);

  const fetchOverviewForShell = useCallback(async (pid: string, wsid: string) => {
    setOverviewLoading(true);
    try {
      const response = await api.get(`/work/projects/${pid}/overview`, {
        headers: { 'x-workspace-id': wsid },
      });
      const payload = (response as any)?.data ?? response;
      const data = (payload as any)?.data ?? payload;
      setOverviewSnapshot(normalizeProjectOverview(data));
    } catch {
      setOverviewSnapshot(null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const refreshOverviewSnapshot = useCallback(async () => {
    const ws = projectWorkspaceRef.current;
    if (!projectId || !ws) return;
    await fetchOverviewForShell(projectId, ws);
  }, [projectId, fetchOverviewForShell]);

  // Determine active tab from current path
  const getActiveTab = (): TabId => {
    const path = location.pathname;
    if (path.includes('/change-requests')) return 'change-requests';
    if (path.includes('/documents')) return 'documents';
    if (path.includes('/budget')) return 'budget';
    if (path.includes('/kpis')) return 'kpis';
    if (path.includes('/plan')) return 'plan';
    if (path.includes('/tasks')) return 'tasks';
    if (path.includes('/board')) return 'board';
    if (path.includes('/gantt')) return 'gantt';
    if (path.includes('/risks')) return 'risks';
    if (path.includes('/resources')) return 'resources';
    return 'overview';
  };

  const activeTab = getActiveTab();

  // Load project data
  const loadProject = async () => {
    if (!projectId) {
      setError('No project ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setWorkspaceDisplayName(null);
      setOverviewSnapshot(null);
      projectWorkspaceRef.current = null;
      const projectData = await projectsApi.getProject(projectId);
      if (projectData) {
        setProject(projectData);
        if (projectData.workspaceId) {
          projectWorkspaceRef.current = projectData.workspaceId;
          setActiveWorkspace(projectData.workspaceId);
          try {
            const ws = await getWorkspace(projectData.workspaceId);
            setWorkspaceDisplayName(ws.name);
          } catch {
            setWorkspaceDisplayName(null);
          }
          await fetchOverviewForShell(projectId, projectData.workspaceId);
        } else {
          projectWorkspaceRef.current = null;
          setOverviewSnapshot(null);
        }
      } else {
        setError('Project not found');
      }
    } catch (err: any) {
      console.error('Failed to load project:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
    // Intentionally projectId only: loadProject syncs active workspace to the
    // project's workspaceId; depending on activeWorkspaceId would double-fetch.
  }, [projectId]);

  // Phase 5B.1 — Waterfall projects must land on the Tasks tab, not Overview.
  // Only redirects once per project load, only when the current URL is the
  // bare /projects/:id (no sub-path), so manual navigation back to Overview
  // is not hijacked.
  const waterfallLandingRedirected = useRef<string | null>(null);
  useEffect(() => {
    if (!project || !projectId) return;
    if (waterfallLandingRedirected.current === projectId) return;
    const isWaterfall = (project.methodology || '').toLowerCase() === 'waterfall';
    if (!isWaterfall) return;
    const path = location.pathname.replace(/\/+$/, '');
    if (path === `/projects/${projectId}`) {
      waterfallLandingRedirected.current = projectId;
      navigate(`/projects/${projectId}/tasks`, { replace: true });
    } else {
      waterfallLandingRedirected.current = projectId;
    }
  }, [project, projectId, location.pathname, navigate]);

  // Handle tab navigation
  const handleTabClick = (tab: typeof PROJECT_TABS[number]) => {
    const basePath = `/projects/${projectId}`;
    navigate(`${basePath}${tab.path}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="Unable to load project"
          description={error}
          icon={<AlertTriangle className="h-12 w-12" />}
          action={
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/projects')}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Back to Projects
              </button>
              <button
                onClick={loadProject}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Try Again
              </button>
            </div>
          }
        />
      </div>
    );
  }

  // No project found
  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="Project not found"
          description="The project you're looking for doesn't exist or you don't have access to it."
          icon={<Folder className="h-12 w-12" />}
          action={
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Back to Projects
            </button>
          }
        />
      </div>
    );
  }

  const duplicateWorkspaceId = project.workspaceId ?? activeWorkspaceId ?? '';

  return (
    <ProjectContext.Provider
      value={{
        project,
        loading,
        error,
        refresh: loadProject,
        workspaceDisplayName,
        overviewSnapshot,
        overviewLoading,
        refreshOverviewSnapshot,
        openSaveAsTemplate: () => setShowSaveAsTemplate(true),
        openDuplicateProject: () => setShowDuplicateProject(true),
      }}
    >
      <div className="min-h-full bg-slate-50">
        {/* Header with breadcrumbs */}
        <div className="bg-white border-b border-slate-200">
          <div className="container mx-auto px-4 py-4">
            {/* Breadcrumbs — workspace is parent when project carries workspaceId */}
            <nav className="mb-2" aria-label="Breadcrumb">
              {project.workspaceId ? (
                <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs list-none m-0 p-0 text-slate-500">
                  <li className="min-w-0">
                    <Link
                      to={`/workspaces/${project.workspaceId}/home`}
                      className="hover:text-indigo-600 truncate max-w-[240px] inline-block align-bottom"
                    >
                      {workspaceDisplayName ?? 'Unknown workspace'}
                    </Link>
                  </li>
                  <li className="text-slate-300 select-none" aria-hidden>
                    /
                  </li>
                  <li
                    className="text-slate-600 font-medium truncate max-w-[min(100%,320px)]"
                    aria-current="page"
                  >
                    {project.name}
                  </li>
                </ol>
              ) : (
                <span className="text-slate-600 font-medium truncate max-w-[320px] text-xs">
                  {project.name}
                </span>
              )}
            </nav>

            {/*
             * Phase 2 (2026-04-08): identity frame renders ONLY on the Overview
             * tab. Operator complaint: "what is showing is Overview its
             * appearing top of Activities dont need that here looks bad."
             * The big metadata block (workspace badge, project name h1,
             * methodology pill, lifecycle pill, status pill, PM/Team/Start/
             * Target 4-cell grid, structure help text) was rendering on every
             * tab, eating screen space above the work surface. Now scoped to
             * Overview only. Breadcrumb (above), status badge + project menu
             * (right), and tab rail (below) all remain visible on every tab —
             * matches ClickUp's pattern of minimal header + tabs always,
             * tab-specific content below. On non-Overview tabs we still render
             * a thin project name h1 so the page has a heading for screen
             * readers and visual anchoring.
             */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              {project.workspaceId && activeTab === 'overview' ? (
                <ProjectIdentityFrame
                  workspaceDisplayName={workspaceDisplayName}
                  workspaceId={project.workspaceId}
                  project={project}
                  overview={overviewSnapshot}
                />
              ) : (
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold text-slate-900 truncate">{project.name}</h1>
                  {project.description && activeTab === 'overview' && (
                    <p className="mt-1 text-sm text-slate-500 line-clamp-2">{project.description}</p>
                  )}
                </div>
              )}

              {/* Project actions (save-as-template, duplicate) moved to toolbar ... menu */}
            </div>

            {project && (
              <>
                <SaveAsTemplateModal
                  open={showSaveAsTemplate}
                  onClose={() => setShowSaveAsTemplate(false)}
                  projectId={project.id}
                  projectName={project.name}
                />
                {duplicateWorkspaceId ? (
                  <DuplicateProjectModal
                    open={showDuplicateProject}
                    onClose={() => setShowDuplicateProject(false)}
                    projectId={project.id}
                    projectName={project.name}
                    workspaceId={duplicateWorkspaceId}
                  />
                ) : null}
              </>
            )}

            {/* Tab Navigation */}
            <div className="mt-6 -mb-px">
              <nav className="flex gap-6" aria-label="Project sections">
                {PROJECT_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab)}
                      className={`
                        flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors
                        ${isActive
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="container mx-auto px-4 py-6">
          <Outlet />
        </div>
      </div>
    </ProjectContext.Provider>
  );
};

export default ProjectPageLayout;
