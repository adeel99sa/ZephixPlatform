import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const ProjectsPageDebug: React.FC = () => {
  const auth = useAuth();
  
  console.log('ProjectsPageDebug rendering...');
  console.log('Auth state:', {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    permissions: auth.permissions
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Projects Debug Page</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
        <div className="space-y-2">
          <p><strong>Is Authenticated:</strong> {auth.isAuthenticated ? 'Yes' : 'No'}</p>
          <p><strong>Is Loading:</strong> {auth.isLoading ? 'Yes' : 'No'}</p>
          <p><strong>User:</strong> {auth.user ? JSON.stringify(auth.user, null, 2) : 'None'}</p>
          <p><strong>Permissions:</strong> {JSON.stringify(auth.permissions, null, 2)}</p>
        </div>
      </div>
      
      <div className="mt-6 bg-blue-50 p-4 rounded">
        <p className="text-blue-800">
          If you can see this page, the routing is working. Check the console for any errors.
        </p>
      </div>
    </div>
  );
};

export default ProjectsPageDebug;
