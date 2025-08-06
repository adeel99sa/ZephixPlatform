import React from 'react';
import { CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import type { Project } from '../../types';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_PRIORITY_COLORS
} from '../../utils/constants';
import { cn } from '../../utils';

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

  // Allow keyboard users to activate the card
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={cn(
        "glass p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-700/50 hover:border-gray-600/50 rounded-xl",
        onClick && "focus:outline-none focus:ring-2 focus:ring-indigo-500"
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Open project: ${project.name}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white mb-2 truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-gray-300 text-sm mb-4 line-clamp-2">
              {project.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                PROJECT_PRIORITY_COLORS[project.priority]
              )}
            >
              {PROJECT_PRIORITY_LABELS[project.priority] || project.priority}
            </span>
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                PROJECT_STATUS_COLORS[project.status]
              )}
            >
              {PROJECT_STATUS_LABELS[project.status] || project.status}
            </span>
          </div>
          {project.deadline && (
            <div className="flex items-center text-xs text-gray-400 mt-1">
              <CalendarIcon className="w-4 h-4 mr-1" aria-hidden="true" />
              {formatDate(project.deadline)}
            </div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 flex flex-col items-end gap-1">
          {project.team && (
            <div className="flex -space-x-1" aria-label={`${project.team.length} team members`}>
              {project.team.slice(0, 3).map((member, idx) => (
                <span
                  key={member.id || idx}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-indigo-500 text-xs font-bold text-white border-2 border-gray-900"
                  title={member.name}
                  aria-label={`Team member: ${member.name}`}
                >
                  {member.avatar || <UserIcon className="h-4 w-4" aria-hidden="true" />}
                </span>
              ))}
              {project.team.length > 3 && (
                <span 
                  className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-gray-700 text-xs font-semibold text-white border-2 border-gray-900"
                  aria-label={`${project.team.length - 3} more team members`}
                >
                  +{project.team.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
