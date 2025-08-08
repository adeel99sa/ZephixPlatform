import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import { useProjectStore } from '../../../stores/projectStore';
import StatusReportingDashboard from '../../../components/pm/status-reporting/StatusReportingDashboard';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';

interface ProjectStatusPageProps {}

const ProjectStatusPage: React.FC<ProjectStatusPageProps> = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { getProject, currentProject, loading: projectLoading } = useProjectStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializePage = async () => {
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
        return;
      }

      if (!projectId) {
        setError('Project ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Load project data
        await getProject(projectId);
        
        if (!currentProject) {
          setError('Project not found or access denied');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [projectId, isAuthenticated, navigate, getProject]);

  const handleReportGenerated = (reportId: string) => {
    // Handle successful report generation
    console.log('Report generated:', reportId);
    // You could show a success notification here
  };

  const handleBackToProject = () => {
    navigate(`/projects/${projectId}`);
  };

  const handleBackToProjects = () => {
    navigate('/projects');
  };

  if (loading || projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading project status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">Error Loading Project</h3>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <div className="mt-6 flex space-x-3">
              <button
                onClick={handleBackToProjects}
                className="flex-1 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Back to Projects
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">Project Not Found</h3>
            <p className="mt-2 text-sm text-gray-600">The project you're looking for doesn't exist or you don't have access to it.</p>
            <div className="mt-6">
              <button
                onClick={handleBackToProjects}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Projects
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToProject}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Project
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {currentProject.name} - Status Reporting
                </h1>
                <p className="text-sm text-gray-600">
                  Project ID: {projectId}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Last updated: {currentProject.updatedAt ? new Date(currentProject.updatedAt).toLocaleDateString() : 'N/A'}
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  currentProject.status === 'active' ? 'bg-green-500' : 
                  currentProject.status === 'paused' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {currentProject.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatusReportingDashboard
          projectId={projectId!}
          onReportGenerated={handleReportGenerated}
        />
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className="font-medium">Zephix</span> - AI-Powered Project Management
            </div>
            <div className="flex items-center space-x-4">
              <span>Status Reporting Dashboard</span>
              <span>•</span>
              <span>Project: {currentProject.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectStatusPage;
