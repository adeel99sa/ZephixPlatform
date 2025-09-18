import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChartBarIcon, UsersIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { TaskList } from '../../components/tasks/TaskList';
import ResourceHeatMap from '../../components/resources/ResourceHeatMap';
import { ProjectResources } from '../../components/projects/ProjectResources';
import { ProjectDisplay } from '../../components/projects/ProjectDisplay';
import { ProjectEditForm } from '../../components/projects/ProjectEditForm';
import { BoardView } from '../../components/views/BoardView';
import { TimelineView } from '../../components/views/TimelineView';
import { projectService } from '../../services/projectService';
import api from '../../services/api';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewType, setViewType] = useState<'list' | 'board' | 'timeline'>('list');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!id || id === 'undefined') {
      setError('Invalid project ID');
      setLoading(false);
      return;
    }
    loadProject();
    loadTasks();
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getProject(id!);
      setProject(data);
    } catch (error: any) {
      console.error('Failed to load project:', error);
      setError('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await api.get(`/projects/${id}/tasks`);
      const responseData = response.data?.data || response.data;
      const tasksArray = Array.isArray(responseData) ? responseData : [];
      setTasks(tasksArray);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    try {
      await api.patch(`/tasks/${taskId}`, updates);
      // Refresh tasks list
      await loadTasks();
      // Trigger KPI recalculation
      await api.post(`/kpi/project/${id}/refresh`);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={() => navigate('/projects')}
            className="mt-2 text-red-600 hover:text-red-800"
          >
            ← Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return <div className="p-6">Project not found</div>;
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'tasks', name: 'Tasks', icon: ChartBarIcon },
    { id: 'resources', name: 'Resources', icon: UsersIcon },
    { id: 'risks', name: 'Risks', icon: ExclamationTriangleIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/projects')}
            className="text-gray-500 hover:text-gray-700 mb-4"
          >
            ← Back to Projects
          </button>
          
          {/* Project Details with Edit Capability */}
          <div className="bg-white rounded-lg shadow p-6">
            {isEditing ? (
              <ProjectEditForm 
                project={project}
                onSave={(updated) => {
                  setProject(updated);
                  setIsEditing(false);
                }}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <ProjectDisplay 
                project={project}
                onEdit={() => setIsEditing(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Start Date</h3>
              <p className="text-2xl font-bold text-gray-900">
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">End Date</h3>
              <p className="text-2xl font-bold text-gray-900">
                {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Progress</h3>
              <p className="text-2xl font-bold text-gray-900">0%</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Team Size</h3>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div>
            {/* View Toggle Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setViewType('list')}
                className={`px-4 py-2 rounded ${viewType === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                List
              </button>
              <button
                onClick={() => setViewType('board')}
                className={`px-4 py-2 rounded ${viewType === 'board' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Board
              </button>
              <button
                onClick={() => setViewType('timeline')}
                className={`px-4 py-2 rounded ${viewType === 'timeline' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Timeline
              </button>
            </div>

            {/* Conditional View Rendering */}
            {viewType === 'list' && <TaskList projectId={project.id} />}
            {viewType === 'board' && <BoardView projectId={project.id} tasks={tasks} onTaskUpdate={handleTaskUpdate} />}
            {viewType === 'timeline' && <TimelineView tasks={tasks} onTaskUpdate={handleTaskUpdate} />}
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Project Resources</h2>
            <ProjectResources projectId={project.id} />
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Risk Dashboard</h2>
            <p className="text-gray-600">Risk detection will appear here once configured.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailPage;