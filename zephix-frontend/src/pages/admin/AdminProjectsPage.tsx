import { useEffect, useState } from 'react';
import { adminApi } from '@/services/adminApi';
import { FolderKanban, Search, Filter, MoreVertical, Archive, Trash2, Eye, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';

interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
  workspaceId?: string;
  workspaceName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('all');
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);

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
    loadProjects();
  }, [authLoading, user, searchTerm, statusFilter, workspaceFilter]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getProjects({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        workspaceId: workspaceFilter !== 'all' ? workspaceFilter : undefined,
      });
      // Handle various response shapes from the API
      const data = response?.projects || (Array.isArray(response) ? response : []);
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (projectId: string) => {
    if (!confirm('Are you sure you want to archive this project?')) return;
    try {
      await adminApi.archiveProject(projectId);
      await loadProjects();
      setShowActionsMenu(null);
    } catch (error) {
      console.error('Failed to archive project:', error);
      alert('Failed to archive project');
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    try {
      await adminApi.deleteProject(projectId);
      await loadProjects();
      setShowActionsMenu(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  const filteredProjects = projects.filter(proj => {
    const matchesSearch = !searchTerm ||
      proj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proj.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || proj.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const uniqueWorkspaces = Array.from(
    new Set(projects.map(p => p.workspaceId).filter((id): id is string => Boolean(id)))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Projects</h1>
          <p className="text-gray-500 mt-1">View and manage all projects across your organization</p>
        </div>
        <Link
          to="/projects"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FolderKanban className="h-4 w-4" />
          Create Project
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          {uniqueWorkspaces.length > 0 && (
            <select
              value={workspaceFilter}
              onChange={(e) => setWorkspaceFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Workspaces</option>
              {uniqueWorkspaces.map(wsId => (
                <option key={wsId} value={wsId}>
                  Workspace {wsId.slice(0, 8)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="text-gray-500">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FolderKanban className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-2">No projects found</p>
          <Link
            to="/projects"
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first project →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredProjects.map((project) => (
              <div key={project.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <FolderKanban className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        <p className="text-sm text-gray-500">{project.description || 'No description'}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {project.workspaceName && (
                            <span>Workspace: {project.workspaceName}</span>
                          )}
                          {project.status && (
                            <span className={`px-2 py-0.5 rounded ${
                              project.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : project.status === 'completed'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {project.status}
                            </span>
                          )}
                          {project.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(project.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/projects/${project.id}`}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="View project"
                    >
                      <Eye className="h-5 w-5" />
                    </Link>
                    <div className="relative">
                      <button
                        onClick={() => setShowActionsMenu(
                          showActionsMenu === project.id ? null : project.id
                        )}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      {showActionsMenu === project.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <button
                            onClick={() => handleArchive(project.id)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Archive className="h-4 w-4" />
                            Archive
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
