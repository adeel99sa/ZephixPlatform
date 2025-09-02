import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/services/api.service';

interface ResourceAllocation {
  id: string;
  resourceId: string;
  resourceName: string;
  projectId: string;
  projectName: string;
  allocationPercentage: number;
  startDate: string;
  endDate: string;
}

export const ResourcesPage: React.FC = () => {
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResourceData();
  }, []);

  const fetchResourceData = async () => {
    try {
      setLoading(true);
      
      // These endpoints need to exist in your backend
      const allocationsData = await apiRequest('resources/allocations');
      setAllocations(allocationsData || []);
      
      const conflictsData = await apiRequest('resources/conflicts');
      setConflicts(conflictsData || []);
    } catch (err) {
      setError('Failed to load resource data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8">Loading...</div>;
  if (error) return <div className="text-red-500 p-8">{error}</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Resource Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Resource Allocations</h2>
          {allocations.length === 0 ? (
            <p className="text-gray-500">No allocations yet</p>
          ) : (
            <ul className="space-y-2">
              {allocations.map(allocation => (
                <li key={allocation.id} className="border-b pb-2">
                  <div className="font-medium">{allocation.resourceName}</div>
                  <div className="text-sm text-gray-600">
                    {allocation.projectName} - {allocation.allocationPercentage}%
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Conflicts</h2>
          {conflicts.length === 0 ? (
            <p className="text-gray-500">No conflicts detected</p>
          ) : (
            <ul className="space-y-2">
              {conflicts.map((conflict, index) => (
                <li key={index} className="border-b pb-2 text-red-600">
                  {JSON.stringify(conflict)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourcesPage;
