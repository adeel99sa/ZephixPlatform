import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EnhancedTimelineView } from '../components/timeline/EnhancedTimelineView';
import { ResourceHeatmap } from '../components/timeline/ResourceHeatmap';
import { api } from '../services/api';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
}

export function TimelineDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'heatmap' | 'dependencies'>('timeline');
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  });

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      setProject(response.data.data);
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    try {
      await api.patch(`/tasks/${taskId}`, updates);
      console.log('Task updated successfully');
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  if (!project) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading project...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-600">{project.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Status: <span className="font-medium capitalize">{project.status}</span>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'timeline'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Timeline View
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'heatmap'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Resource Heatmap
            </button>
            <button
              onClick={() => setActiveTab('dependencies')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dependencies'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dependencies
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'timeline' && (
          <EnhancedTimelineView
            projectId={projectId!}
            onTaskUpdate={handleTaskUpdate}
          />
        )}

        {activeTab === 'heatmap' && (
          <div className="space-y-6">
            {/* Date Range Selector */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Date Range</h3>
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.start.toISOString().split('T')[0]}
                    onChange={(e) => setDateRange(prev => ({
                      ...prev,
                      start: new Date(e.target.value)
                    }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.end.toISOString().split('T')[0]}
                    onChange={(e) => setDateRange(prev => ({
                      ...prev,
                      end: new Date(e.target.value)
                    }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <ResourceHeatmap
              projectId={projectId!}
              startDate={dateRange.start}
              endDate={dateRange.end}
            />
          </div>
        )}

        {activeTab === 'dependencies' && (
          <DependenciesView projectId={projectId!} />
        )}
      </div>
    </div>
  );
}

// Dependencies View Component
function DependenciesView({ projectId }: { projectId: string }) {
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDependencies();
  }, [projectId]);

  const loadDependencies = async () => {
    try {
      setLoading(true);
      // This would be a real API call to get dependencies
      // For now, we'll show a placeholder
      setDependencies([]);
    } catch (error) {
      console.error('Failed to load dependencies:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading dependencies...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-4">Task Dependencies</h3>
      <p className="text-gray-600">
        Dependencies are managed through the Timeline view. Drag and drop tasks to create dependencies,
        or use the dependency creation tools in the timeline interface.
      </p>
    </div>
  );
}

