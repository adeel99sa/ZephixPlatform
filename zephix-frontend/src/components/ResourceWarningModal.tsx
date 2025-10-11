import React, { useState } from 'react';

interface AllocationData {
  percentage: number;
  currentAllocation: number;
  proposedAllocation: number;
  userName: string;
  requiresJustification: boolean;
  requiresApproval: boolean;
}

interface ResourceWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  allocation: AllocationData;
  onConfirm: (justification?: string) => void;
}

export const ResourceWarningModal: React.FC<ResourceWarningModalProps> = ({ 
  isOpen, 
  onClose, 
  allocation,
  onConfirm 
}) => {
  const [justification, setJustification] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (allocation.requiresJustification && !justification.trim()) {
      return; // Don't allow confirmation without justification
    }
    onConfirm(justification);
    setJustification(''); // Reset for next time
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 120) return 'text-red-600';
    if (percentage >= 100) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getCapacityBgColor = (percentage: number) => {
    if (percentage >= 120) return 'bg-red-50 border-red-200';
    if (percentage >= 100) return 'bg-orange-50 border-orange-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Resource Allocation Warning
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className={`p-4 rounded-lg border ${getCapacityBgColor(allocation.percentage)}`}>
            <p className="text-gray-700 mb-2">
              This assignment will put <span className="font-semibold">{allocation.userName}</span> at{' '}
              <span className={`font-bold ${getCapacityColor(allocation.percentage)}`}>
                {Math.round(allocation.percentage)}%
              </span>{' '}
              capacity.
            </p>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Current:</span>
                <span className="ml-2 font-semibold">{allocation.currentAllocation}%</span>
              </div>
              <div>
                <span className="text-gray-600">Proposed:</span>
                <span className="ml-2 font-semibold">{allocation.proposedAllocation}%</span>
              </div>
            </div>
          </div>

          {allocation.requiresJustification && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please provide justification for this overallocation:
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Explain why this overallocation is necessary..."
                required
              />
            </div>
          )}

          {allocation.requiresApproval && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-yellow-800 text-sm font-medium">
                  This requires admin approval
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={allocation.requiresJustification && !justification.trim()}
              className={`px-4 py-2 rounded-md transition-colors ${
                allocation.requiresJustification && !justification.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {allocation.requiresApproval ? 'Submit for Approval' : 'Proceed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
