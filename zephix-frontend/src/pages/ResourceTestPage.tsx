import React, { useState } from 'react';
import { ResourceWarningModal } from '../components/ResourceWarningModal';

export const ResourceTestPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testAllocation, setTestAllocation] = useState({
    percentage: 125,
    currentAllocation: 80,
    proposedAllocation: 125,
    userName: 'John Doe',
    requiresJustification: true,
    requiresApproval: true
  });

  const handleConfirm = (justification?: string) => {
    console.log('Resource assignment confirmed with justification:', justification);
    setIsModalOpen(false);
    // In a real app, this would make an API call to confirm the assignment
  };

  const testScenarios = [
    {
      name: 'Warning (125%)',
      allocation: {
        percentage: 125,
        currentAllocation: 80,
        proposedAllocation: 125,
        userName: 'John Doe',
        requiresJustification: true,
        requiresApproval: true
      }
    },
    {
      name: 'Critical (150%)',
      allocation: {
        percentage: 150,
        currentAllocation: 100,
        proposedAllocation: 150,
        userName: 'Jane Smith',
        requiresJustification: true,
        requiresApproval: true
      }
    },
    {
      name: 'Justification Only (110%)',
      allocation: {
        percentage: 110,
        currentAllocation: 60,
        proposedAllocation: 110,
        userName: 'Bob Wilson',
        requiresJustification: true,
        requiresApproval: false
      }
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Resource Allocation Warning System
          </h1>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Test Scenarios
            </h2>
            <p className="text-gray-600 mb-6">
              Click on any scenario below to test the resource allocation warning modal:
            </p>
            
            <div className="grid gap-4">
              {testScenarios.map((scenario, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setTestAllocation(scenario.allocation);
                    setIsModalOpen(true);
                  }}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">{scenario.name}</h3>
                      <p className="text-sm text-gray-600">
                        {scenario.allocation.userName} - {scenario.allocation.percentage}% capacity
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        scenario.allocation.percentage >= 120 ? 'text-red-600' :
                        scenario.allocation.percentage >= 100 ? 'text-orange-600' :
                        'text-yellow-600'
                      }`}>
                        {scenario.allocation.percentage}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {scenario.allocation.requiresApproval ? 'Approval Required' : 'Justification Required'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">1. Threshold Detection</h3>
                <p className="text-blue-700 text-sm">
                  System automatically detects when resource allocation exceeds 100% capacity
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-2">2. Warning Display</h3>
                <p className="text-yellow-700 text-sm">
                  Modal shows current vs proposed allocation with clear visual indicators
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">3. Approval Flow</h3>
                <p className="text-green-700 text-sm">
                  Requires justification and/or admin approval based on allocation level
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ResourceWarningModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        allocation={testAllocation}
        onConfirm={handleConfirm}
      />
    </div>
  );
};
