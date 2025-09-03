import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useProjectStore } from '../../stores/projectStore';
import { useTemplateStore } from '../../stores/templateStore';
import { TemplateSelector } from '../templates/TemplateSelector';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefilledData?: any;
}

interface Template {
  id: string;
  name: string;
  methodology: string;
  description?: string;
  phases: any[];
}

type Step = 'template' | 'details';

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  prefilledData
}) => {
  const { createProject } = useProjectStore();
  const { selectedTemplate, clearSelection } = useTemplateStore();
  
  const [currentStep, setCurrentStep] = useState<Step>('template');
  const [selectedTemplateData, setSelectedTemplateData] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: prefilledData?.name || '',
    description: prefilledData?.description || '',
    startDate: '',
    endDate: '',
    status: 'planning',
    budget: '',
    priority: prefilledData?.priority || 'medium',
    department: '',
    stakeholders: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('template');
      setSelectedTemplateData(null);
      setError(null);
      clearSelection();
    }
  }, [isOpen, clearSelection]);

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplateData(template);
    // Pre-fill form data based on template
    setFormData(prev => ({
      ...prev,
      methodology: template.methodology,
      template: template.name.toLowerCase().replace(/\s+/g, '_')
    }));
  };

  const handleNext = () => {
    if (currentStep === 'template' && selectedTemplateData) {
      setCurrentStep('details');
    }
  };

  const handleBack = () => {
    if (currentStep === 'details') {
      setCurrentStep('template');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare data for API call
      const projectData = {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        status: formData.status,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        template: selectedTemplateData?.name.toLowerCase().replace(/\s+/g, '_') || 'custom',
        methodology: selectedTemplateData?.methodology || 'agile',
        priority: formData.priority,
        department: formData.department || undefined,
        stakeholders: formData.stakeholders ? formData.stakeholders.split(',').map(s => s.trim()).filter(s => s) : undefined,
        templateId: selectedTemplateData?.id
      };

      const success = await createProject(projectData);
      
      if (success) {
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          name: '',
          description: '',
          startDate: '',
          endDate: '',
          status: 'planning',
          budget: '',
          priority: 'medium',
          department: '',
          stakeholders: ''
        });
        setCurrentStep('template');
        setSelectedTemplateData(null);
        setError(null);
        clearSelection();
      } else {
        setError('Failed to create project. Please try again.');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setCurrentStep('template');
    setSelectedTemplateData(null);
    clearSelection();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>
            <div className="flex items-center mt-2 space-x-4">
              <div className={`flex items-center ${currentStep === 'template' ? 'text-indigo-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'template' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  1
                </div>
                <span className="ml-2 text-sm font-medium">Template</span>
              </div>
              <div className={`flex items-center ${currentStep === 'details' ? 'text-indigo-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'details' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Details</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {currentStep === 'template' && (
            <TemplateSelector
              onTemplateSelect={handleTemplateSelect}
              onBack={handleClose}
              onNext={handleNext}
              selectedTemplate={selectedTemplateData}
            />
          )}

          {currentStep === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Project Details
                </h3>
                {selectedTemplateData && (
                  <p className="text-sm text-gray-600">
                    Using <strong>{selectedTemplateData.name}</strong> template
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget
                  </label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter budget amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter department"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter project description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stakeholders
                </label>
                <input
                  type="text"
                  value={formData.stakeholders}
                  onChange={(e) => setFormData(prev => ({ ...prev, stakeholders: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter stakeholders (comma-separated)"
                />
              </div>

              <div className="flex justify-between pt-6 border-t">
                <Button type="button" onClick={handleBack} variant="outline">
                  Back
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !formData.name}
                  className="flex items-center"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};