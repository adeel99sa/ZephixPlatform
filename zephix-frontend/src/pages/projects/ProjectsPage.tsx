import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import projectService, { Project, CreateProjectDto } from '../../services/projectService';
import authService from '../../services/authService';
import { CreateProjectPanel } from '../../components/projects/CreateProjectPanel';

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getProjects();
      setProjects(data.projects);
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message || 'Failed to fetch projects');
      } else {
        setError('An unexpected error occurred');
      }
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
      await projectService.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message || 'Failed to delete project');
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Projects</h1>
        <button
          onClick={() => setShowCreatePanel(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create Project
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div key={project.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
            <Link to={`/projects/${project.id}`} className="text-xl font-semibold mb-2 hover:text-blue-600">
              {project.name}
            </Link>
            <p className="text-gray-600 mb-4">{project.description}</p>
            <div className="flex justify-between items-center">
              <span className={`px-2 py-1 rounded text-sm ${
                project.status === 'active' ? 'bg-green-100 text-green-800' :
                project.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {project.status}
              </span>
              <button
                onClick={() => handleDeleteProject(project.id)}
                className="text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Project Panel */}
      <CreateProjectPanel 
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        onSuccess={() => {
          fetchProjects(); // Refresh the list
          setShowCreatePanel(false);
        }}
      />
    </div>
  );
};

export default ProjectsPage;
export { ProjectsPage };