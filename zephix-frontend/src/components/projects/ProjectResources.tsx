import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CreateResourceModal } from '../resources/CreateResourceModal';

interface Resource {
  id: string;
  name: string;
  email?: string;
  role?: string;
  skills?: string[];
  capacityHoursPerWeek?: number;
  costPerHour?: number;
  isActive?: boolean;
}

interface ProjectResourcesProps {
  projectId: string;
}

export function ProjectResources({ projectId }: ProjectResourcesProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadResources();
  }, [projectId]);

  const loadResources = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the API
      const response = await api.get('/resources');
      
      // Debug log to see actual response structure
      console.log('Resources API response:', response);
      
      // Handle various response formats
      let resourceData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          resourceData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          resourceData = response.data.data;
        } else if (response.data.resources && Array.isArray(response.data.resources)) {
          resourceData = response.data.resources;
        }
      }
      
      // Ensure we always set an array
      setResources(resourceData);
      
    } catch (err: any) {
      console.error('Failed to load resources:', err);
      
      // Check if it's an auth error but DON'T logout
      if (err.response?.status === 401) {
        setError('Session expired. Please refresh the page.');
      } else {
        setError('Unable to load resources');
      }
      
      // Set empty array on error
      setResources([]);
      
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3" role="status" aria-label="Loading resources">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4" role="alert">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading resources</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Project Resources</h3>
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Create Resource
          </button>
          <button 
            onClick={() => {/* TODO: Add assign modal */}}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Assign Resource
          </button>
        </div>
      </div>
      
      {resources.length === 0 ? (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No resources assigned</h3>
          <p className="mt-1 text-sm text-gray-500">No resources have been assigned to this project yet.</p>
          <button 
            onClick={() => {/* TODO: Add assign modal */}}
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            Assign first resource
          </button>
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="Project resources">
          {resources.map((resource) => (
            <div 
              key={resource.id} 
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
              role="listitem"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">{resource.name}</h4>
                  {resource.role && (
                    <p className="text-sm text-gray-500 truncate">{resource.role}</p>
                  )}
                  {resource.email && (
                    <p className="text-xs text-gray-400 truncate">{resource.email}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {resource.capacityHoursPerWeek && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {resource.capacityHoursPerWeek}h/week
                    </span>
                  )}
                  {resource.isActive === false && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Resource Modal */}
      {showCreateModal && (
        <CreateResourceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(resource) => {
            console.log('Resource created:', resource);
            setShowCreateModal(false);
            loadResources(); // Reload resources to show the new one
          }}
        />
      )}
    </div>
  );
}
