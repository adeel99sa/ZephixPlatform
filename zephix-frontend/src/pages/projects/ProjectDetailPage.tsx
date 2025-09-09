import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Users, Calendar, AlertTriangle, Flag } from 'lucide-react';
import { apiJson } from '../../services/api';
import { TaskManagement } from '../../components/projects/TaskManagement';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  methodology: string;
  startDate: string;
  endDate: string;
  phases: Phase[];
}

interface Phase {
  id: string;
  phaseName: string;
  status: string;
  progressPercentage: number;
  totalTasks: number;
  completedTasks: number;
}

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const data = await apiJson(`/projects/${projectId}`);
      setProject(data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/projects')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <p className="text-sm text-gray-500">{project.description}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded text-sm ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
              <button className="p-2 hover:bg-gray-100 rounded">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Project Info Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center space-x-8 text-sm">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Flag className="h-4 w-4 text-gray-400" />
              <span className="capitalize">{project.priority} Priority</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="capitalize">{project.methodology}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            {['tasks', 'timeline', 'resources', 'risks', 'documents'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'tasks' && (
          <TaskManagement projectId={project.id} phases={project.phases || []} />
        )}
        
        {activeTab === 'timeline' && (
          <div className="bg-white rounded-lg p-6">
            <p className="text-gray-500">Timeline view coming soon...</p>
          </div>
        )}
        
        {activeTab === 'resources' && (
          <div className="bg-white rounded-lg p-6">
            <p className="text-gray-500">Resource management coming soon...</p>
          </div>
        )}
        
        {activeTab === 'risks' && (
          <div className="bg-white rounded-lg p-6">
            <p className="text-gray-500">Risk management coming soon...</p>
          </div>
        )}
        
        {activeTab === 'documents' && (
          <div className="bg-white rounded-lg p-6">
            <p className="text-gray-500">Document management coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'planning': return 'bg-gray-100 text-gray-700';
    case 'active': return 'bg-green-100 text-green-700';
    case 'on-hold': return 'bg-yellow-100 text-yellow-700';
    case 'completed': return 'bg-blue-100 text-blue-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

