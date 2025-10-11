import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectService } from '../services/projectService';

type TabType = 'tasks' | 'timeline' | 'kanban' | 'calendar' | 'files' | 'settings';

export function ProjectDetail() {
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    setLoading(true);
    try {
      const response = await projectService.getProject(projectId!);
      setProject(response); // response is already unwrapped by projectService
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading project...</div>;
  }

  if (!project) {
    return <div className="p-6">Project not found</div>;
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'tasks', label: 'Tasks' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'kanban', label: 'Board' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'files', label: 'Files' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Project Header */}
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        {project.description && (
          <p className="text-gray-600 mt-1">{project.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'tasks' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Tasks</h2>
            <p className="text-gray-600">Task management interface will be implemented here.</p>
          </div>
        )}
        {activeTab === 'timeline' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Timeline</h2>
            <p className="text-gray-600">Gantt chart view will be implemented here.</p>
          </div>
        )}
        {activeTab === 'kanban' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Kanban Board</h2>
            <p className="text-gray-600">Kanban board view will be implemented here.</p>
          </div>
        )}
        {activeTab === 'calendar' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Calendar</h2>
            <p className="text-gray-600">Calendar view will be implemented here.</p>
          </div>
        )}
        {activeTab === 'files' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Files</h2>
            <p className="text-gray-600">File management interface will be implemented here.</p>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Project Settings</h2>
            <p className="text-gray-600">Project settings interface will be implemented here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
