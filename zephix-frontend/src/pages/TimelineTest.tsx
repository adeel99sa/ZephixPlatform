import React, { useState, useEffect } from 'react';
import { EnhancedTimelineView } from '../components/timeline/EnhancedTimelineView';
import { ResourceHeatmap } from '../components/timeline/ResourceHeatmap';
import { api } from '../services/api';

const TimelineTest: React.FC = () => {
  const [projectId] = useState('46d2f087-aab8-4bcf-8e09-8372ea038298');
  const [timelineData, setTimelineData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTimelineData();
  }, [projectId]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/timeline/project/${projectId}`);
      setTimelineData(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch timeline data:', err);
      setError('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    try {
      if (updates.start || updates.end) {
        // Move task
        await api.post(`/timeline/task/${taskId}/move`, {
          newStartDate: updates.start,
          newEndDate: updates.end
        });
      }
      
      // Refresh data
      await fetchTimelineData();
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Failed to update task');
    }
  };

  const handleDependencyCreate = async (predecessorId: string, successorId: string) => {
    try {
      await api.post('/timeline/dependency', {
        predecessorId,
        successorId,
        type: 'finish_to_start'
      });
      
      // Refresh data
      await fetchTimelineData();
    } catch (err) {
      console.error('Failed to create dependency:', err);
      setError('Failed to create dependency');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading timeline data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!timelineData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">No timeline data available</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Timeline System Test</h1>
        <p className="text-gray-600 mt-2">
          Interactive Gantt chart with dependency management and real-time updates
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline View */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Project Timeline</h2>
            <EnhancedTimelineView
              projectId={projectId}
              onTaskUpdate={handleTaskUpdate}
              onDependencyCreate={handleDependencyCreate}
            />
          </div>
        </div>

        {/* Resource Heatmap */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Resource Allocation</h2>
            <ResourceHeatmap projectId={projectId} />
          </div>
        </div>
      </div>

      {/* Timeline Data Debug */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Timeline Data (Debug)</h3>
        <div className="text-sm text-gray-600">
          <p>Total Tasks: {timelineData.data?.tasks?.length || 0}</p>
          <p>Critical Path Tasks: {timelineData.data?.criticalPath?.length || 0}</p>
          <p>Resources: {timelineData.data?.resources?.length || 0}</p>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-blue-600">View Raw Data</summary>
          <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-64">
            {JSON.stringify(timelineData, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default TimelineTest;

