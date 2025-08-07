import React from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useProjectSelection } from '../../hooks/useProjectSelection';
import type { Project } from '../../types';

export const ProjectStats: React.FC = () => {
  const { projects } = useProjectStore();
  const { selectedProject, isSelected } = useProjectSelection();
  
  const totalProjects = projects.length;
  const activeProjects = projects.filter(project => 
    project.status === 'Building' || 
    project.status === 'Planning' || 
    project.status === 'Review'
  ).length;

  return (
    <div>
      <h3 className="text-lg font-bold tracking-tight text-white mb-3">Project Overview</h3>
      <div className="space-y-3">
        <div className="bg-gray-700/50 rounded-xl px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Total Projects</span>
            <span className="text-2xl font-bold text-indigo-400">{totalProjects}</span>
          </div>
        </div>
        <div className="bg-gray-700/50 rounded-xl px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Active Projects</span>
            <span className="text-lg font-semibold text-green-400">
              {activeProjects}
            </span>
          </div>
        </div>
        {selectedProject && (
          <div className="bg-gray-700/50 rounded-xl px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Selected Project</span>
              <div className="text-right">
                <div className="text-sm font-medium text-white">{selectedProject.name}</div>
                <div className="text-xs text-gray-400">{selectedProject.category} • {selectedProject.status}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
