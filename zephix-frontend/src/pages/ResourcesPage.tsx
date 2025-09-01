import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface ResourceAllocation {
  id: string;
  userId: string;
  projectId: string;
  allocationPercentage: number;
  startDate: string;
  endDate: string;
  userEmail?: string;
  projectName?: string;
}

interface ResourceConflict {
  id: string;
  userId: string;
  conflictType: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedProjects: string[];
  totalAllocation: number;
}

interface ConflictDetectionRequest {
  userId: string;
  projectId: string;
  allocationPercentage: number;
  startDate: string;
  endDate: string;
}

export const ResourcesPage: React.FC = () => {
  const [conflicts, setConflicts] = useState<ResourceConflict[]>([]);
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for new allocation
  const [showNewAllocationForm, setShowNewAllocationForm] = useState(false);
  const [newAllocation, setNewAllocation] = useState<ConflictDetectionRequest>({
    userId: '',
    projectId: '',
    allocationPercentage: 0,
    startDate: '',
    endDate: ''
  });
  
  // Conflict detection result
  const [conflictCheckResult, setConflictCheckResult] = useState<any>(null);

  useEffect(() => {
    fetchResourceData();
  }, []);

  const fetchResourceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch conflicts
      const conflictsResponse = await api.get('/resources/conflicts');
      setConflicts(conflictsResponse || []);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resource data');
      console.error('Resource data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConflictDetection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);
      const result = await api.post('/resources/detect-conflicts', newAllocation);
      setConflictCheckResult(result);
      
      // If no conflicts, offer to create the allocation
      if (result && !result.hasConflicts) {
        const shouldCreate = window.confirm('No conflicts detected. Create this allocation?');
        if (shouldCreate) {
          await handleCreateAllocation();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conflict detection failed');
      console.error('Conflict detection error:', err);
    }
  };

  const handleCreateAllocation = async () => {
    try {
      await api.post('/resources/allocations', newAllocation);
      setNewAllocation({
        userId: '',
        projectId: '',
        allocationPercentage: 0,
        startDate: '',
        endDate: ''
      });
      setShowNewAllocationForm(false);
      setConflictCheckResult(null);
      await fetchResourceData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create allocation');
      console.error('Allocation creation error:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-800 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-800 bg-blue-100 border-blue-200';
      default: return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Resource Management</h1>
          <p className="text-gray-600 mt-1">
            Prevent resource conflicts with proactive allocation management
          </p>
        </div>
        <button
          onClick={() => setShowNewAllocationForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          New Allocation
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Resource Conflicts Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Resource Conflicts</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              conflicts.length > 0 
                ? 'bg-red-100 text-red-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {conflicts.length} conflicts detected
            </span>
          </div>
        </div>
        
        <div className="p-6">
          {conflicts.length > 0 ? (
            <div className="space-y-4">
              {conflicts.map((conflict) => (
                <div 
                  key={conflict.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(conflict.severity)}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{conflict.description}</h3>
                      <p className="text-sm opacity-75 mt-1">
                        Total allocation: {conflict.totalAllocation}%
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {conflict.affectedProjects.map((project, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-50"
                          >
                            {project}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getSeverityColor(conflict.severity)}`}>
                      {conflict.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No conflicts detected</h3>
              <p className="mt-1 text-sm text-gray-500">
                All resource allocations are within capacity limits
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Allocation Form Modal */}
      {showNewAllocationForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create Resource Allocation</h3>
            </div>
            
            <form onSubmit={handleConflictDetection} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID
                </label>
                <input
                  type="text"
                  value={newAllocation.userId}
                  onChange={(e) => setNewAllocation(prev => ({ ...prev, userId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter user ID"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project ID
                </label>
                <input
                  type="text"
                  value={newAllocation.projectId}
                  onChange={(e) => setNewAllocation(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project ID"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allocation Percentage
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newAllocation.allocationPercentage}
                  onChange={(e) => setNewAllocation(prev => ({ ...prev, allocationPercentage: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newAllocation.startDate}
                  onChange={(e) => setNewAllocation(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={newAllocation.endDate}
                  onChange={(e) => setNewAllocation(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Conflict Check Result */}
              {conflictCheckResult && (
                <div className={`p-4 rounded-lg ${
                  conflictCheckResult.hasConflicts 
                    ? 'bg-red-50 border border-red-200' 
                    : 'bg-green-50 border border-green-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    conflictCheckResult.hasConflicts ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {conflictCheckResult.message || (conflictCheckResult.hasConflicts ? 'Conflicts detected!' : 'No conflicts detected')}
                  </p>
                </div>
              )}

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Check for Conflicts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewAllocationForm(false);
                    setConflictCheckResult(null);
                    setNewAllocation({
                      userId: '',
                      projectId: '',
                      allocationPercentage: 0,
                      startDate: '',
                      endDate: ''
                    });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Allocations</p>
              <p className="text-2xl font-semibold text-gray-900">{allocations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Resource Conflicts</p>
              <p className="text-2xl font-semibold text-gray-900">{conflicts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Conflicts Prevented</p>
              <p className="text-2xl font-semibold text-gray-900">24</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};