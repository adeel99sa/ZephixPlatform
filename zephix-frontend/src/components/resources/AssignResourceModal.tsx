import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface AssignResourceModalProps {
  projectId: string;
  taskId?: string;
  onClose: () => void;
  onSuccess: (assignment: any) => void;
}

export function AssignResourceModal({ projectId, taskId, onClose, onSuccess }: AssignResourceModalProps) {
  const [resources, setResources] = useState<any[]>([]);
  const [selectedResource, setSelectedResource] = useState('');
  const [allocationType, setAllocationType] = useState<'task' | 'project'>('project');
  const [allocationData, setAllocationData] = useState({
    hoursPerWeek: 40,
    allocationPercentage: 100,
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictCheck, setConflictCheck] = useState<any>(null);

  useEffect(() => {
    loadAvailableResources();
  }, []);

  useEffect(() => {
    if (selectedResource && allocationData.startDate && allocationData.endDate) {
      checkConflicts();
    }
  }, [selectedResource, allocationData.startDate, allocationData.endDate, allocationData.allocationPercentage]);

  const loadAvailableResources = async () => {
    try {
      const response = await api.get('/resources');
      const resourceList = Array.isArray(response.data?.data) ? response.data.data : [];
      setResources(resourceList);
    } catch (err) {
      console.error('Failed to load resources:', err);
      setError('Failed to load resources');
    }
  };

  const checkConflicts = async () => {
    if (!selectedResource || !allocationData.startDate || !allocationData.endDate) return;
    
    try {
      const response = await api.get(`/resources/${selectedResource}/allocation`, {
        params: {
          startDate: allocationData.startDate,
          endDate: allocationData.endDate
        }
      });
      
      const currentAllocation = response.data?.allocationPercentage || 0;
      const newTotal = currentAllocation + allocationData.allocationPercentage;
      
      setConflictCheck({
        current: currentAllocation,
        new: allocationData.allocationPercentage,
        total: newTotal,
        isOverallocated: newTotal > 100,
        isCritical: newTotal > 120
      });
    } catch (err) {
      console.error('Failed to check conflicts:', err);
    }
  };

  const handleAssign = async () => {
    if (!selectedResource) {
      setError('Please select a resource');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const payload = {
        resourceId: selectedResource,
        projectId,
        taskId,
        ...allocationData
      };
      
      console.log('Assigning resource with payload:', payload);
      
      const response = await api.post('/resource-allocations', payload);
      console.log('Resource assigned successfully:', response.data);
      
      onSuccess(response.data);
      onClose();
      
    } catch (err: any) {
      console.error('Failed to assign resource:', err);
      setError(err.response?.data?.message || 'Failed to assign resource');
    } finally {
      setLoading(false);
    }
  };

  const selectedResourceData = resources.find(r => r.id === selectedResource);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Assign Resource</h2>
        
        {/* Resource Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Resource</label>
          <select
            value={selectedResource}
            onChange={(e) => setSelectedResource(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="">Choose a resource...</option>
            {resources.map(resource => (
              <option key={resource.id} value={resource.id}>
                {resource.name || resource.email} - {resource.role || 'Team Member'}
                {resource.capacityHoursPerWeek && ` (${resource.capacityHoursPerWeek} hrs/week)`}
              </option>
            ))}
          </select>
        </div>

        {/* Allocation Type */}
        {taskId && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Assignment Type</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="project"
                  checked={allocationType === 'project'}
                  onChange={(e) => setAllocationType('project')}
                  className="mr-2"
                />
                Entire Project
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="task"
                  checked={allocationType === 'task'}
                  onChange={(e) => setAllocationType('task')}
                  className="mr-2"
                />
                This Task Only
              </label>
            </div>
          </div>
        )}

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={allocationData.startDate}
              onChange={(e) => setAllocationData({...allocationData, startDate: e.target.value})}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={allocationData.endDate}
              onChange={(e) => setAllocationData({...allocationData, endDate: e.target.value})}
              min={allocationData.startDate}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>
        </div>

        {/* Allocation Percentage */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Allocation Percentage
            <span className="text-gray-500 ml-2">({allocationData.allocationPercentage}%)</span>
          </label>
          <input
            type="range"
            min="10"
            max="150"
            step="10"
            value={allocationData.allocationPercentage}
            onChange={(e) => setAllocationData({...allocationData, allocationPercentage: parseInt(e.target.value)})}
            className="w-full"
            disabled={loading}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>10%</span>
            <span>50%</span>
            <span>100%</span>
            <span>150%</span>
          </div>
        </div>

        {/* Conflict Warning */}
        {conflictCheck && (
          <div className={`mb-4 p-3 rounded ${
            conflictCheck.isCritical ? 'bg-red-50 border border-red-300' :
            conflictCheck.isOverallocated ? 'bg-yellow-50 border border-yellow-300' :
            'bg-green-50 border border-green-300'
          }`}>
            <div className="font-medium mb-1">
              {conflictCheck.isCritical ? '⚠️ Critical Overallocation' :
               conflictCheck.isOverallocated ? '⚠️ Resource Overallocated' :
               '✅ No Conflicts'}
            </div>
            <div className="text-sm">
              Current allocation: {conflictCheck.current}%<br/>
              This assignment: {conflictCheck.new}%<br/>
              Total allocation: {conflictCheck.total}%
            </div>
            {conflictCheck.isOverallocated && (
              <div className="text-sm mt-2 font-medium">
                {conflictCheck.isCritical ? 
                  'Requires approval for allocation above 120%' :
                  'Resource will be over 100% capacity'}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || !selectedResource || !allocationData.endDate}
            className={`px-4 py-2 rounded text-white disabled:opacity-50 ${
              conflictCheck?.isCritical ? 'bg-red-600 hover:bg-red-700' :
              conflictCheck?.isOverallocated ? 'bg-yellow-600 hover:bg-yellow-700' :
              'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Assigning...' : 
             conflictCheck?.isCritical ? 'Assign Anyway (Requires Approval)' :
             conflictCheck?.isOverallocated ? 'Assign with Warning' :
             'Assign Resource'}
          </button>
        </div>
      </div>
    </div>
  );
}
