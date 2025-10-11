import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit2, Plus, MoreVertical } from 'lucide-react';
import { workspaceService } from '../services/workspaceService';
import { projectService } from '../services/projectService';
import { useAuth } from '../hooks/useAuth';

interface WorkspaceData {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  stats: {
    projectCount: number;
    taskCount: number;
    memberCount: number;
  };
}

interface Project {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
}

export function WorkspaceLanding() {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspaceId) {
      loadWorkspaceData();
    }
  }, [workspaceId]);

  const loadWorkspaceData = async () => {
    setLoading(true);
    try {
      // Load workspace info
      const wsResponse = await workspaceService.getById(workspaceId!);
      const workspaceData = wsResponse.data;
      setWorkspace({
        id: workspaceData.id,
        name: workspaceData.name,
        description: workspaceData.description || '',
        ownerId: workspaceData.ownerId,
        stats: {
          projectCount: 0, // Will be updated after loading projects
          taskCount: 0,
          memberCount: 0,
        }
      });
      setDescription(workspaceData.description || '');

      // Load projects in this workspace
      const projResponse = await projectService.getByWorkspace(workspaceId!);
      const projectsData = projResponse.projects || [];
      setProjects(projectsData);
      
      // Update workspace stats with project count
      setWorkspace(prev => prev ? {
        ...prev,
        stats: {
          ...prev.stats,
          projectCount: projectsData.length
        }
      } : null);
    } catch (error) {
      console.error('Failed to load workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDescription = async () => {
    try {
      await workspaceService.update(workspaceId!, { description });
      setIsEditingDescription(false);
      loadWorkspaceData();
    } catch (error) {
      console.error('Failed to save description:', error);
    }
  };

  const handleCreateProject = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Navigate to project creation with workspace context
    navigate(`/projects/create?workspaceId=${workspaceId}`);
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  if (loading) {
    return <div className="p-6">Loading workspace...</div>;
  }

  if (!workspace) {
    return <div className="p-6">Workspace not found</div>;
  }

  const isOwner = user?.id === workspace.ownerId || user?.role === 'admin';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Workspace Card (Rectangular) */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold mb-2">{workspace.name}</h1>
            
            {/* Editable Description */}
            {isEditingDescription ? (
              <div className="space-y-2">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Add a description for this workspace..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDescription}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingDescription(false);
                      setDescription(workspace.description || '');
                    }}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="text-gray-600 text-sm">
                  {description || 'No description yet. Click "Edit Info" to add one.'}
                </p>
                {isOwner && (
                  <button
                    onClick={() => setIsEditingDescription(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          {isOwner && (
            <button className="text-gray-500 hover:text-gray-700">
              <MoreVertical size={20} />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-500">Projects:</span>{' '}
            <span className="font-medium">{workspace.stats.projectCount}</span>
          </div>
          <div>
            <span className="text-gray-500">Tasks:</span>{' '}
            <span className="font-medium">{workspace.stats.taskCount}</span>
          </div>
          <div>
            <span className="text-gray-500">Members:</span>{' '}
            <span className="font-medium">{workspace.stats.memberCount}</span>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Projects</h2>
          <button
            onClick={handleCreateProject}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No projects yet. Create your first project to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleProjectClick(project.id)}
                className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 cursor-pointer"
              >
                <div>
                  <h3 className="font-medium">{project.name}</h3>
                  <p className="text-sm text-gray-500">
                    Status: {project.status} • Updated: {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle project menu
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspaceLanding;
