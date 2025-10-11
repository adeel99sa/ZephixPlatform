import React from 'react';
import { HeatmapGrid } from '../components/resources/HeatmapGrid';
import { useAuthStore } from '../stores/authStore';

const HeatmapPage: React.FC = () => {
  const { user } = useAuthStore();
  const organizationId = user?.organizationId;

  if (!organizationId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Authentication Required</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Please log in to view the resource heatmap.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Resource Heatmap</h1>
        <p className="text-gray-600 mt-2">
          Visual representation of resource utilization and conflicts
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <HeatmapGrid organizationId={organizationId} />
      </div>
    </div>
  );
};

export default HeatmapPage;
