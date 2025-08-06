import React from 'react';
import { CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import type { Project } from '../../types';
import { 
  PROJECT_STATUS_LABELS, 
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_PRIORITY_COLORS 
} from '../../utils/constants';
import { clsx } from 'clsx';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className="glass p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-700/50 hover:border-gray-600/50"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-gray-300 text-sm mb-4 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 ml-4">
          <span
            className={clsx(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
              PROJECT_STATUS_COLORS[project.status]
            )}
          >
            {PROJECT_STATUS_LABELS[project.status]}
          </span>
          <span
            className={clsx(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
              PROJECT_PRIORITY_COLORS[project.priority]
            )}
          >
            {PROJECT_PRIORITY_LABELS[project.priority]}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-400 mt-4">
        <div className="flex items-center">
          <CalendarIcon className="h-4 w-4 mr-1" />
          <span>Due: {formatDate(project.endDate)}</span>
        </div>
        <div className="flex items-center">
          <UserIcon className="h-4 w-4 mr-1" />
          <span>{project.team?.members?.length || 0} members</span>
        </div>
      </div>

      {project.budget && (
        <div className="mt-3 text-sm text-gray-400">
          Budget: ${project.budget.toLocaleString()}
        </div>
      )}
    </div>
  );
}; 