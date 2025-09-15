import React, { useState, useEffect } from 'react';
import { AllocationConflict, Alternative } from '../../types/resource.types';
import { resourceService } from '../../services/resourceService';
import { ExclamationTriangleIcon, CheckCircleIcon, LightBulbIcon } from '@heroicons/react/24/outline';

interface ConflictResolverProps {
  resourceId: string;
  taskId: string;
  estimatedHours: number;
  startDate: string;
  endDate: string;
  onResolve: (solution: any) => void;
  onCancel: () => void;
}

const ConflictResolver: React.FC<ConflictResolverProps> = ({
  resourceId,
  taskId,
  estimatedHours,
  startDate,
  endDate,
  onResolve,
  onCancel
}) => {
  const [conflict, setConflict] = useState<AllocationConflict | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlternative, setSelectedAlternative] = useState<Alternative | null>(null);
  const [justification, setJustification] = useState('');
  const [requiresJustification, setRequiresJustification] = useState(false);

  useEffect(() => {
    checkForConflicts();
  }, [resourceId, estimatedHours, startDate, endDate]);

  const checkForConflicts = async () => {
    try {
      setLoading(true);
      const conflictData = await resourceService.checkConflicts(
        resourceId,
        startDate,
        endDate,
        estimatedHours
      );
      
      setConflict(conflictData);
      
      // Require justification if over 100%
      if (conflictData && conflictData.totalAllocation > 100) {
        setRequiresJustification(true);
      }
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedWithOverallocation = () => {
    if (requiresJustification && !justification.trim()) {
      alert('Please provide justification for overallocation');
      return;
    }

    onResolve({
      type: 'override',
      resourceId,
      justification,
      acceptedRisk: true
    });
  };

  const handleAcceptAlternative = (alternative: Alternative) => {
    onResolve({
      type: 'alternative',
      alternative,
      resourceId
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking for conflicts...</p>
        </div>
      </div>
    );
  }

  if (!conflict) {
    // No conflict, proceed automatically
    setTimeout(() => {
      onResolve({ type: 'no-conflict', resourceId });
    }, 500);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="flex items-center text-green-600 mb-4">
            <CheckCircleIcon className="h-8 w-8 mr-2" />
            <h3 className="text-lg font-semibold">No Conflicts Detected</h3>
          </div>
          <p className="text-gray-600">Resource allocation is within acceptable limits.</p>
        </div>
      </div>
    );
  }

  const getSeverityColor = (percentage: number) => {
    if (percentage <= 100) return 'text-yellow-600 bg-yellow-50';
    if (percentage <= 120) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 border-b ${getSeverityColor(conflict.totalAllocation)}`}>
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 mr-3" />
            <div>
              <h2 className="text-xl font-bold">Resource Conflict Detected</h2>
              <p className="text-sm mt-1">
                {conflict.resourceName} will be at {Math.round(conflict.totalAllocation)}% capacity
              </p>
            </div>
          </div>
        </div>

        {/* Conflict Details */}
        <div className="p-6 border-b">
          <h3 className="font-semibold mb-3">Allocation Details</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Current Load:</span>
              <span className="ml-2 font-medium">{conflict.currentAllocation} hrs/week</span>
            </div>
            <div>
              <span className="text-gray-500">Requested:</span>
              <span className="ml-2 font-medium">{conflict.requestedHours} hrs/week</span>
            </div>
            <div>
              <span className="text-gray-500">Total:</span>
              <span className="ml-2 font-medium text-red-600">
                {conflict.currentAllocation + conflict.requestedHours} hrs/week
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  conflict.totalAllocation > 120 ? 'bg-red-500' :
                  conflict.totalAllocation > 100 ? 'bg-orange-400' :
                  'bg-yellow-400'
                }`}
                style={{ width: `${Math.min(conflict.totalAllocation, 150)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
              <span>150%</span>
            </div>
          </div>
        </div>

        {/* AI Alternatives */}
        <div className="p-6 border-b">
          <div className="flex items-center mb-3">
            <LightBulbIcon className="h-5 w-5 text-yellow-500 mr-2" />
            <h3 className="font-semibold">AI-Suggested Alternatives</h3>
          </div>
          
          <div className="space-y-3">
            {conflict.alternatives.map((alt, idx) => (
              <div
                key={idx}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedAlternative === alt 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedAlternative(alt)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="font-medium">{alt.description}</span>
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                        alt.confidence >= 80 ? 'bg-green-100 text-green-800' :
                        alt.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {alt.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{alt.impact}</p>
                  </div>
                  {selectedAlternative === alt && (
                    <CheckCircleIcon className="h-5 w-5 text-blue-500 ml-2" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedAlternative && (
            <button
              onClick={() => handleAcceptAlternative(selectedAlternative)}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Accept {selectedAlternative.description}
            </button>
          )}
        </div>

        {/* Override with Justification */}
        <div className="p-6 border-b">
          <h3 className="font-semibold mb-3">Override Allocation</h3>
          {conflict.totalAllocation > 120 ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              <strong>Warning:</strong> Allocation exceeds maximum threshold (120%). 
              Manager approval required.
            </div>
          ) : conflict.totalAllocation > 100 ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
              <strong>Justification Required:</strong> Allocation exceeds normal capacity.
            </div>
          ) : null}

          {requiresJustification && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Justification for Overallocation
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Explain why this overallocation is necessary..."
              />
            </div>
          )}

          <button
            onClick={handleProceedWithOverallocation}
            disabled={conflict.totalAllocation > 150}
            className={`mt-4 w-full py-2 px-4 rounded-lg ${
              conflict.totalAllocation > 150
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {conflict.totalAllocation > 150
              ? 'Allocation Exceeds Maximum (150%)'
              : 'Proceed with Overallocation'}
          </button>
        </div>

        {/* Actions */}
        <div className="p-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolver;
