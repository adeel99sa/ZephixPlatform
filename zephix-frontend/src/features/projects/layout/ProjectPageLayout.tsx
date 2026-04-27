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
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Folder, LayoutDashboard, ListTodo, AlertTriangle, Users, LayoutGrid, Table2, BarChart3, GitPullRequest, FileText, DollarSign, Activity, Shield } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { getWorkspace } from '@/features/workspaces/api';
// useProjectPermissions moved to toolbar ... menu (ProjectTasksTab)
import { projectsApi, projectShowsGovernanceIndicator, type ProjectDetail } from '../projects.api';
import { ProjectWorkToolbar } from '../components/ProjectWorkToolbar';
import { WorkSurfaceUiProvider } from './WorkSurfaceUiContext';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { SaveAsTemplateModal } from '../components/SaveAsTemplateModal';
import { DuplicateProjectModal } from '../components/DuplicateProjectModal';
// ProjectIdentityFrame removed — project name + description now in persistent header
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
const MVP_VISIBLE_TAB_IDS = new Set(['overview', 'tasks', 'board', 'gantt', 'table', 'documents']);
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

  // Waterfall redirect removed — all projects land on Overview first.

  // Handle tab navigation
  const handleTabClick = (tab: typeof PROJECT_TABS[number]) => {
    const basePath = `/projects/${projectId}`;
    const nextPath = `${basePath}${tab.path}`;
    const qs = location.search ?? '';
    navigate({ pathname: nextPath, search: qs });
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

  const showWorkSurfaceToolbar =
    activeTab === 'tasks' || activeTab === 'board' || activeTab === 'gantt';

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
      <WorkSurfaceUiProvider>
      <div className="min-h-full bg-slate-50">
        <div className="bg-white border-b border-slate-200">
          <div className="container mx-auto px-4 py-4">
            {/* Persistent project header — visible on all tabs, editable */}
            <EditableProjectHeader
              project={project}
              onSave={async (patch) => {
                await projectsApi.updateProjectSettings(project.id, patch);
                await loadProject();
              }}
            />

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
          {showWorkSurfaceToolbar && <ProjectWorkToolbar />}
          <Outlet />
        </div>
      </div>
      </WorkSurfaceUiProvider>
    </ProjectContext.Provider>
  );
};

/* ── Editable Project Header ─────────────────────────────────── */

function EditableProjectHeader({
  project,
  onSave,
}: {
  project: ProjectDetail;
  onSave: (patch: { name?: string; description?: string }) => Promise<void>;
}) {
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [nameVal, setNameVal] = useState(project.name);
  const [descVal, setDescVal] = useState(project.description || '');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // Sync if project changes externally
  useEffect(() => { setNameVal(project.name); }, [project.name]);
  useEffect(() => { setDescVal(project.description || ''); }, [project.description]);

  const saveName = async () => {
    const trimmed = nameVal.trim();
    if (!trimmed || trimmed === project.name) { setEditingName(false); setNameVal(project.name); return; }
    setSaving(true);
    try { await onSave({ name: trimmed }); } catch { setNameVal(project.name); }
    finally { setSaving(false); setEditingName(false); }
  };

  const saveDesc = async () => {
    const trimmed = descVal.trim();
    if (trimmed === (project.description || '')) { setEditingDesc(false); return; }
    setSaving(true);
    try { await onSave({ description: trimmed || undefined }); } catch { setDescVal(project.description || ''); }
    finally { setSaving(false); setEditingDesc(false); }
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl p-6 mb-4"
      style={{
        background: 'linear-gradient(135deg, #EEEDFE 0%, #E6F1FB 100%)',
        border: '0.5px solid #CECBF6',
      }}
    >
      <div
        className="pointer-events-none absolute"
        style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(127,119,221,0.08)', top: -20, right: -10 }}
      />
      <div
        className="pointer-events-none absolute"
        style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(55,138,221,0.06)', bottom: -15, right: 60 }}
      />
      <div className="relative">
        {/* Editable project name */}
        {editingName ? (
          <input
            ref={nameRef}
            autoFocus
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setNameVal(project.name); setEditingName(false); } }}
            disabled={saving}
            className="w-full text-2xl font-bold bg-white/60 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-300"
            style={{ color: '#26215C' }}
          />
        ) : (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1
              className="min-w-0 flex-1 truncate text-2xl font-bold cursor-text hover:bg-white/30 rounded-lg px-2 py-1 -mx-2 transition-colors sm:flex-none sm:max-w-[min(100%,42rem)]"
              style={{ color: '#26215C' }}
              onClick={() => setEditingName(true)}
              title="Click to edit project name"
            >
              {project.name}
            </h1>
            {projectShowsGovernanceIndicator(project) && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-800"
                title="This project inherits governance policies from its template. Some actions may require an admin-approved exception before they succeed."
              >
                <Shield className="h-3 w-3 text-purple-600" aria-hidden />
                Governed
              </span>
            )}
          </div>
        )}

        {/* Editable description */}
        {editingDesc ? (
          <textarea
            ref={descRef}
            autoFocus
            value={descVal}
            onChange={(e) => setDescVal(e.target.value)}
            onBlur={saveDesc}
            onKeyDown={(e) => { if (e.key === 'Escape') { setDescVal(project.description || ''); setEditingDesc(false); } }}
            disabled={saving}
            rows={3}
            className="w-full mt-2 text-sm bg-white/60 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            style={{ color: '#534AB7', lineHeight: 1.6 }}
            placeholder="Add a project description..."
          />
        ) : (
          <p
            className="mt-2 cursor-text hover:bg-white/30 rounded-lg px-2 py-1 -mx-2 transition-colors"
            style={{
              fontSize: 14,
              color: '#534AB7',
              opacity: project.description?.trim() ? 0.8 : 0.5,
              lineHeight: 1.6,
              fontStyle: project.description?.trim() ? 'normal' : 'italic',
            }}
            onClick={() => setEditingDesc(true)}
            title="Click to edit description"
          >
            {project.description?.trim() || 'Add a project description...'}
          </p>
        )}
      </div>
    </div>
  );
}

export default ProjectPageLayout;
