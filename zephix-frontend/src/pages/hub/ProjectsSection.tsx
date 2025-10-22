import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { getErrorText } from '@/lib/api/errors';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProjectsSection() {
  const {
    data: projectsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiClient.get<{ projects: Project[] }>(API_ENDPOINTS.PROJECTS.LIST);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-sm text-gray-400">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-sm text-red-500">Failed to load projects: {getErrorText(error)}</div>
      </div>
    );
  }

  const projects = projectsData?.projects || [];

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Projects</h3>
        <Link 
          to="/projects/list" 
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          View all →
        </Link>
      </div>
      
      {projects.length === 0 ? (
        <div className="text-sm text-gray-500">No projects found</div>
      ) : (
        <div className="space-y-2">
          {projects.slice(0, 5).map((project) => (
            <div key={project.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
              <div>
                <div className="font-medium text-sm">{project.name}</div>
                <div className="text-xs text-gray-500">{project.status}</div>
              </div>
              <Link 
                to={`/projects/${project.id}`}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                View →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
