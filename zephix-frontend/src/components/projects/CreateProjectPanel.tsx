import React, { useState } from 'react';
import { X, Calendar, User, Flag, ChevronRight } from 'lucide-react';
import { projectService } from '../../services/projectService';

interface CreateProjectPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AVAILABLE_PHASES = [
  { name: 'Initiation', defaultDuration: 5 },
  { name: 'Planning', defaultDuration: 10 },
  { name: 'Design', defaultDuration: 15 },
  { name: 'Development', defaultDuration: 30 },
  { name: 'Testing/QA', defaultDuration: 15 },
  { name: 'UAT', defaultDuration: 10 },
  { name: 'Go-Live', defaultDuration: 2 },
  { name: 'Closing', defaultDuration: 5 }
];

export const CreateProjectPanel: React.FC<CreateProjectPanelProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    priority: 'medium',
    methodology: 'agile',
    status: 'planning',
    selectedPhases: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Only send fields that the backend DTO expects
      const { selectedPhases, ...projectData } = formData;
      
      // Convert dates to ISO 8601 format
      const formattedData = {
        ...projectData,
        startDate: projectData.startDate ? new Date(projectData.startDate).toISOString() : undefined,
        endDate: projectData.endDate ? new Date(projectData.endDate).toISOString() : undefined,
      };
      
      await projectService.createProject(formattedData);
      
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        priority: 'medium',
        methodology: 'agile',
        status: 'planning',
        selectedPhases: []
      });
      setStep(1);
    } catch (err) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Create New Project</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Step indicator */}
            <div className="mt-4 flex items-center space-x-2">
              <div className={`px-3 py-1 rounded ${step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                1. Basic Info
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <div className={`px-3 py-1 rounded ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                2. Timeline
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <div className={`px-3 py-1 rounded ${step === 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                3. Phases
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 rounded bg-red-50 p-3 text-red-600">
                {error}
              </div>
            )}

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full rounded border px-3 py-2"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full rounded border px-3 py-2"
                    rows={3}
                    placeholder="Project description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      className="w-full rounded border px-3 py-2"
                    >
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Methodology
                    </label>
                    <select
                      value={formData.methodology}
                      onChange={(e) => setFormData({...formData, methodology: e.target.value})}
                      className="w-full rounded border px-3 py-2"
                    >
                      <option value="agile">Agile</option>
                      <option value="waterfall">Waterfall</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="scrum">Scrum</option>
                      <option value="kanban">Kanban</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Timeline */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>
                </div>

                {formData.startDate && formData.endDate && (
                  <div className="rounded bg-blue-50 p-3">
                    <p className="text-sm text-blue-700">
                      Project Duration: {calculateDuration(formData.startDate, formData.endDate)} days
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Phase Selection */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Select the phases needed for this project:
                </p>
                
                <div className="space-y-2">
                  {AVAILABLE_PHASES.map((phase) => (
                    <label key={phase.name} className="flex items-center p-3 border rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.selectedPhases.includes(phase.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedPhases: [...formData.selectedPhases, phase.name]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedPhases: formData.selectedPhases.filter(p => p !== phase.name)
                            });
                          }
                        }}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{phase.name}</div>
                        <div className="text-sm text-gray-500">
                          Default duration: {phase.defaultDuration} days
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4">
            <div className="flex justify-between">
              <button
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Previous
              </button>
              
              <div className="space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                
                {step < 3 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    disabled={step === 1 && !formData.name}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !formData.name || !formData.startDate || !formData.endDate}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Project'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function
function calculateDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}


