import React from 'react';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  startDate?: string;
  endDate?: string;
  methodology?: string;
}

interface ProjectDisplayProps {
  project: Project;
  onEdit: () => void;
}

export function ProjectDisplay({ project, onEdit }: ProjectDisplayProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Edit Project
        </button>
      </div>
      
      <p className="text-gray-600 mb-4">{project.description || 'No description'}</p>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="font-semibold">Status:</span> 
          <span className={`ml-2 px-2 py-1 rounded text-sm ${
            project.status === 'active' ? 'bg-green-100 text-green-800' :
            project.status === 'planning' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {project.status}
          </span>
        </div>
        <div>
          <span className="font-semibold">Priority:</span> 
          <span className={`ml-2 px-2 py-1 rounded text-sm ${
            project.priority === 'high' ? 'bg-red-100 text-red-800' :
            project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            project.priority === 'low' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {project.priority}
          </span>
        </div>
        <div>
          <span className="font-semibold">Start Date:</span> {formatDate(project.startDate)}
        </div>
        <div>
          <span className="font-semibold">End Date:</span> {formatDate(project.endDate)}
        </div>
        <div>
          <span className="font-semibold">Methodology:</span> {project.methodology || 'Not set'}
        </div>
        <div>
          <span className="font-semibold">Project ID:</span> {project.id}
        </div>
      </div>
    </div>
  );
}





