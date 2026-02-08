/**
 * ProjectPageLayout
 * 
 * Shared layout wrapper for all project pages providing:
 * - Breadcrumb navigation (Projects > {Project Name})
 * - Tab navigation (Overview, Plan, Tasks, Risks, Resources)
 * - Loading and error states
 * - Consistent spacing and structure
 */

import React, { useEffect, useState } from 'react';
import { Outlet, useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Folder, LayoutDashboard, ListTodo, AlertTriangle, Users, LayoutGrid, BarChart3, Zap } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { projectsApi, type ProjectDetail } from '../projects.api';
import { EmptyState } from '@/components/ui/feedback/EmptyState';

/**
 * Tab configuration for project pages
 */
const PROJECT_TABS = [
  { id: 'overview', label: 'Overview', path: '', icon: LayoutDashboard },
  { id: 'plan', label: 'Plan', path: '/plan', icon: Folder },
  { id: 'tasks', label: 'Tasks', path: '/tasks', icon: ListTodo },
  { id: 'board', label: 'Board', path: '/board', icon: LayoutGrid },
  { id: 'gantt', label: 'Gantt', path: '/gantt', icon: BarChart3 },
  { id: 'sprints', label: 'Sprints', path: '/sprints', icon: Zap },
  { id: 'risks', label: 'Risks', path: '/risks', icon: AlertTriangle },
  { id: 'resources', label: 'Resources', path: '/resources', icon: Users },
] as const;

type TabId = typeof PROJECT_TABS[number]['id'];

interface ProjectContextValue {
  project: ProjectDetail | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Context to share project data with child routes
export const ProjectContext = React.createContext<ProjectContextValue>({
  project: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function useProjectContext() {
  return React.useContext(ProjectContext);
}

export const ProjectPageLayout: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeWorkspaceId } = useWorkspaceStore();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine active tab from current path
  const getActiveTab = (): TabId => {
    const path = location.pathname;
    // Check for specific tab paths
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
      const projectData = await projectsApi.getProject(projectId);
      if (projectData) {
        setProject(projectData);
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
  }, [projectId, activeWorkspaceId]);

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

  return (
    <ProjectContext.Provider value={{ project, loading, error, refresh: loadProject }}>
      <div className="min-h-full bg-slate-50">
        {/* Header with breadcrumbs */}
        <div className="bg-white border-b border-slate-200">
          <div className="container mx-auto px-4 py-4">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm mb-4">
              <Link
                to="/projects"
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Projects</span>
              </Link>
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <span className="text-slate-900 font-medium truncate max-w-[300px]">
                {project.name}
              </span>
            </nav>

            {/* Project Header */}
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-slate-900 truncate">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                    {project.description}
                  </p>
                )}
              </div>
              
              {/* Status badge */}
              <div className="ml-4 shrink-0">
                <StatusBadge status={project.status} />
              </div>
            </div>

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

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    planning: 'bg-blue-100 text-blue-800',
    'on-hold': 'bg-yellow-100 text-yellow-800',
    completed: 'bg-slate-100 text-slate-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

export default ProjectPageLayout;
