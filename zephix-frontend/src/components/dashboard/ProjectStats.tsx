import React, { memo } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useProjectSelection } from '../../hooks/useProjectSelection';

export const ProjectStats: React.FC = memo(() => {
  const { projects } = useProjectStore();
  const { selectedProject } = useProjectSelection();

  const activeProjects = projects.filter((project) => 
    project.status === 'Planning' || project.status === 'Building' || project.status === 'Review'
  );

  return (
    <div className="glass p-6 border border-gray-700/50">
      <h3 className="text-lg font-semibold text-white mb-4">Project Overview</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Total Projects</span>
          <span className="text-2xl font-bold text-indigo-400">{projects.length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Active Projects</span>
          <span className="text-lg font-semibold text-green-400">
            {activeProjects.length}
          </span>
        </div>
        {selectedProject && (
          <div className="pt-4 border-t border-gray-600">
            <div className="text-sm text-gray-400 mb-2">Selected Project</div>
            <div className="text-white font-medium">{selectedProject.name}</div>
            <div className="text-sm text-gray-400">
              {selectedProject.category} • {selectedProject.status}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ProjectStats.displayName = 'ProjectStats';
