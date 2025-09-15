// File: src/pages/dashboard/DashboardPage.tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import ResourceHeatMap from './ResourceHeatMap';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(state => state.user);

  const handleCreateProject = () => {
    console.log('Button clicked!');
    console.log('Current path:', location.pathname);
    console.log('Attempting navigation to /projects');
    
    try {
      navigate('/projects');
      console.log('Navigate function executed');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleViewReports = () => {
    console.log('View Reports clicked');
    navigate('/analytics');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Welcome Section */}
      <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Welcome to Zephix!</h2>
          <p className="text-gray-600 mb-4">Your AI-powered project management platform is ready to help you succeed.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={handleCreateProject}
              className="bg-indigo-50 p-4 rounded-lg cursor-pointer hover:bg-indigo-100"
            >
              <h3 className="font-medium text-indigo-900">Projects</h3>
              <p className="text-indigo-600 text-sm">Manage your projects</p>
            </div>
            <div 
              onClick={() => navigate('/ai/suggestions')}
              className="bg-green-50 p-4 rounded-lg cursor-pointer hover:bg-green-100"
            >
              <h3 className="font-medium text-green-900">AI Assistant</h3>
              <p className="text-green-600 text-sm">Get AI-powered insights</p>
            </div>
            <div 
              onClick={handleViewReports}
              className="bg-purple-50 p-4 rounded-lg cursor-pointer hover:bg-purple-100"
            >
              <h3 className="font-medium text-purple-900">Analytics</h3>
              <p className="text-purple-600 text-sm">Track performance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={handleCreateProject}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium"
            >
              Create New Project
            </button>
            <button 
              type="button"
              onClick={handleViewReports}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium"
            >
              View Reports
            </button>
          </div>
        </div>
      </div>

      <ResourceHeatMap />
    </div>
  );
};