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
        "bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl px-6 py-5 shadow-xl shadow-indigo-500/10",
        "outline outline-2 outline-transparent hover:outline-indigo-500/20",
        "hover:scale-[1.015] active:scale-[1.01] transition-all duration-300 ease-out",
        "cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/20",
        onClick && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Open project: ${project.name} - ${project.status} status, ${project.priority} priority`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white mb-3 truncate">
            {project.name}
          </h3>
        </div>
        <div className="ml-4 flex-shrink-0 flex flex-col items-end gap-2">
          {project.team && (
            <div className="flex -space-x-2" aria-label={`${project.team.length} team members`}>
              {project.team.slice(0, 3).map((member, idx) => (
                <span
                  key={member.id || idx}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-xs font-bold text-white border-2 border-slate-800 shadow-lg"
                  title={member.name}
                  aria-label={`Team member: ${member.name}`}
                >
                  {member.avatar || <UserIcon className="h-4 w-4" aria-hidden="true" />}
                </span>
              ))}
              {project.team.length > 3 && (
                <span 
                  className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 text-xs font-semibold text-white border-2 border-slate-800 shadow-lg"
                  aria-label={`${project.team.length - 3} more team members`}
                >
                  +{project.team.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {typeof project.progress === 'number' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Progress</span>
            <span className="text-sm font-semibold text-white">{project.progress}%</span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-500 rounded-full transition-all duration-500 ease-out shadow-lg"
              style={{ 
                width: `${project.progress}%`,
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)'
              }}
              role="progressbar"
              aria-valuenow={project.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {/* Status and Priority Labels */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className={cn(
            "text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20",
            PROJECT_PRIORITY_COLORS[project.priority as keyof typeof PROJECT_PRIORITY_COLORS]
          )}
        >
          {PROJECT_PRIORITY_LABELS[project.priority as keyof typeof PROJECT_PRIORITY_LABELS] || project.priority}
        </span>
        <span
          className={cn(
            "text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20",
            PROJECT_STATUS_COLORS[project.status as keyof typeof PROJECT_STATUS_COLORS]
          )}
        >
          {PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS] || project.status}
        </span>
      </div>

      {/* Deadline */}
      {project.deadline && (
        <div className="flex items-center text-xs text-gray-400">
          <CalendarIcon className="w-4 h-4 mr-2" aria-hidden="true" />
          <span>Due {formatDate(project.deadline.toString())}</span>
        </div>
      )}
    </div>
  );
};
