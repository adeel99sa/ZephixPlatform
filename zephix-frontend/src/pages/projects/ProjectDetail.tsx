import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CalendarIcon, CurrencyDollarIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useProjectStore } from '../../stores/projectStore';
import { Button } from '../../components/ui/Button';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, fetchProjects } = useProjectStore();
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      if (id) {
        // First try to find in existing projects
        const existingProject = projects.find(p => p.id === id);
        if (existingProject) {
          setProject(existingProject);
          setIsLoading(false);
        } else {
          // If not found, fetch all projects and try again
          await fetchProjects();
          const foundProject = projects.find(p => p.id === id);
          setProject(foundProject || null);
          setIsLoading(false);
        }
      }
    };

    loadProject();
  }, [id, projects, fetchProjects]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return 'Not set';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h2>
          <p className="text-gray-600 mb-6">The project you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/projects')}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/projects')}
                  className="mr-4"
                >
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                  <p className="text-gray-600 mt-1">{project.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  project.status === 'active' ? 'bg-green-100 text-green-800' :
                  project.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                  project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  project.priority === 'high' ? 'bg-red-100 text-red-800' :
                  project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {project.priority} priority
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Project Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Methodology</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{project.methodology || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Template</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{project.template || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <p className="mt-1 text-sm text-gray-900">{project.department || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Risk Level</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{project.riskLevel || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Timeline</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <CalendarIcon className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Start Date</p>
                    <p className="text-sm text-gray-900">{formatDate(project.startDate)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">End Date</p>
                    <p className="text-sm text-gray-900">{formatDate(project.endDate)}</p>
                  </div>
                </div>
                {project.estimatedEndDate && (
                  <div className="flex items-center">
                    <CalendarIcon className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Estimated End Date</p>
                      <p className="text-sm text-gray-900">{formatDate(project.estimatedEndDate)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Budget */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Budget</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <CurrencyDollarIcon className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Planned Budget</p>
                    <p className="text-sm text-gray-900">{formatCurrency(project.budget)}</p>
                  </div>
                </div>
                {project.actualCost && (
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Actual Cost</p>
                      <p className="text-sm text-gray-900">{formatCurrency(project.actualCost)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stakeholders */}
            {project.stakeholders && project.stakeholders.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Stakeholders</h2>
                <div className="flex items-center">
                  <UserGroupIcon className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-900">{project.stakeholders.join(', ')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Created</p>
                  <p className="text-sm text-gray-900">{formatDate(project.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Last Updated</p>
                  <p className="text-sm text-gray-900">{formatDate(project.updatedAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Project ID</p>
                  <p className="text-sm text-gray-900 font-mono">{project.id}</p>
                </div>
              </div>
            </div>

            {/* Future Sections Placeholder */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks</h3>
              <p className="text-sm text-gray-500">Task management coming soon...</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resources</h3>
              <p className="text-sm text-gray-500">Resource allocation coming soon...</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Risks</h3>
              <p className="text-sm text-gray-500">Risk management coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
