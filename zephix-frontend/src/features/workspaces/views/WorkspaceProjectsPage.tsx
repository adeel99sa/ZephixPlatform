/**
 * Phase 7: Workspace Projects Page
 * Lists all projects in a workspace
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectsApi, ProjectDetail } from '@/features/projects/projects.api';
import { FolderKanban, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useAuth } from '@/state/AuthContext';

export default function WorkspaceProjectsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectDetail[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Guard: Don't fire requests until auth state is READY
    if (authLoading) {
      return;
    }
    // Only load if user is authenticated
    if (!user) {
      setLoading(false);
      return;
    }
    if (id) {
      loadProjects();
    }
  }, [authLoading, user, id]);

  const loadProjects = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await projectsApi.getProjects({ workspaceId: id });
      setProjects(response.projects || []);
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setError(err?.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="workspace-projects-page-root">
        <div className="text-center py-12 text-gray-500">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="workspace-projects-page-root">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">Error loading projects</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="workspace-projects-page-root">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        </div>
        <Link to="/templates">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FolderKanban className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No projects in this workspace yet.</p>
          <Link to="/templates">
            <Button>Create Project from Template</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}/overview`}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              data-testid={`project-card-${project.id}`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{project.tasksCount} tasks</span>
                <span>{project.risksCount} risks</span>
                <span>{project.progress}% complete</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}













