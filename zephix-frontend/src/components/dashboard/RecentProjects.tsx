import React from 'react';
import { ChevronRight, Clock, Users } from 'lucide-react';
import type { Project } from '../../types';

interface RecentProjectsProps {
  onProjectClick?: (project: Project) => void;
}

export const RecentProjects: React.FC<RecentProjectsProps> = ({ onProjectClick }) => {
  // Mock data for recent projects
  const recentProjects: Project[] = [
    {
      id: '1',
      name: 'E-commerce Platform Redesign',
      status: 'Building',
      progress: 75,
      priority: 'High',
      health: 'On Track',
      category: 'Development',
      deadline: new Date('2024-12-15'),
      team: [
        { id: '1', name: 'Sarah Chen', role: 'Lead Developer', avatar: 'SC', availability: 'Available' },
        { id: '2', name: 'Mike Johnson', role: 'UX Designer', avatar: 'MJ', availability: 'Busy' }
      ],
      milestones: [
        { id: '1', name: 'Design System', status: 'done', dueDate: new Date('2024-10-15') },
        { id: '2', name: 'Frontend Development', status: 'inprogress', dueDate: new Date('2024-11-30') },
        { id: '3', name: 'Backend Integration', status: 'todo', dueDate: new Date('2024-12-15') }
      ],
      risks: [
        { id: '1', description: 'Third-party API dependencies', severity: 'Medium', probability: 'High' }
      ],
      opportunities: [
        { id: '1', description: 'Mobile app expansion', potential: 'High', effort: 'Medium' }
      ]
    },
    {
      id: '2',
      name: 'Mobile App MVP',
      status: 'Planning',
      progress: 25,
      priority: 'Medium',
      health: 'At Risk',
      category: 'Development',
      deadline: new Date('2024-11-30'),
      team: [
        { id: '3', name: 'Alex Rivera', role: 'Product Manager', avatar: 'AR', availability: 'Available' }
      ],
      milestones: [
        { id: '1', name: 'Market Research', status: 'done', dueDate: new Date('2024-09-30') },
        { id: '2', name: 'Prototype Design', status: 'inprogress', dueDate: new Date('2024-10-15') },
        { id: '3', name: 'User Testing', status: 'todo', dueDate: new Date('2024-11-15') }
      ],
      risks: [
        { id: '1', description: 'Limited development resources', severity: 'High', probability: 'Medium' }
      ],
      opportunities: [
        { id: '1', description: 'Enterprise partnerships', potential: 'Medium', effort: 'Low' }
      ]
    }
  ];

  const handleProjectClick = (project: Project) => {
    if (onProjectClick) {
      onProjectClick(project);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">Recent Projects</h3>
      <div className="space-y-3">
        {recentProjects.map((project) => (
          <div
            key={project.id}
            onClick={() => handleProjectClick(project)}
            className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleProjectClick(project)}
            aria-label={`View ${project.name} project details`}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-white text-sm">{project.name}</h4>
              <ChevronRight className="w-4 h-4 text-gray-400" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" />
                {project.status}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" aria-hidden="true" />
                {project.team.length} members
              </span>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress}%` }}
                  role="progressbar"
                  aria-valuenow={project.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
