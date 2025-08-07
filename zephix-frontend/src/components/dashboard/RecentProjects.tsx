import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useProjectSelection } from '../../hooks/useProjectSelection';
import type { Project } from '../../types';

interface RecentProjectsProps {
  onProjectClick?: (project: Project) => void;
}

export const RecentProjects: React.FC<RecentProjectsProps> = ({ onProjectClick }) => {
  const { projects } = useProjectStore();
  const { selectedProject, isSelected } = useProjectSelection();

  const handleProjectClick = (project: Project) => {
    if (onProjectClick) {
      onProjectClick(project);
    }
  };

  // Don't render if no projects
  if (!projects || projects.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Building':
        return 'text-green-400';
      case 'Planning':
        return 'text-yellow-400';
      case 'Complete':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div>
      <h3 className="text-lg font-bold tracking-tight text-white mb-3">Recent Projects</h3>
      <div className="space-y-2">
        {projects.map((project: Project) => (
          <div
            key={project.id}
            className={`bg-gray-700/50 rounded-xl px-5 py-4 hover:bg-gray-700 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 ${
              isSelected(project.id) ? 'ring-2 ring-indigo-400' : ''
            }`}
            onClick={() => handleProjectClick(project)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleProjectClick(project);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Open project: ${project.name}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold tracking-tight text-white text-sm mb-1">{project.name}</h4>
                <div className="flex items-center space-x-2 text-xs">
                  <span className={getStatusColor(project.status)}>{project.status}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-400">{project.category}</span>
                </div>
                {isSelected(project.id) && (
                  <div className="flex items-center space-x-2 mt-1 text-xs text-indigo-400">
                    <span>✓ Selected</span>
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
