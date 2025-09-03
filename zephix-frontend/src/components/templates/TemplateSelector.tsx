import React, { useEffect } from 'react';
import { TemplateCard } from './TemplateCard';
import { useTemplateStore } from '../../stores/templateStore';
import { Button } from '../ui/Button';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface Template {
  id: string;
  name: string;
  methodology: string;
  description?: string;
  structure: any[];
  metrics: any[];
  is_active: boolean;
  is_system: boolean;
  organization_id?: string;
  version: number;
  created_at: string;
  updated_at: string;
  phases: any[];
}

interface TemplateSelectorProps {
  onTemplateSelect: (template: Template) => void;
  onBack: () => void;
  onNext: () => void;
  selectedTemplate?: Template | null;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onTemplateSelect,
  onBack,
  onNext,
  selectedTemplate,
}) => {
  const { templates, isLoading, error, fetchTemplates, selectTemplate } = useTemplateStore();

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleTemplateSelect = (template: Template) => {
    selectTemplate(template);
    onTemplateSelect(template);
  };

  const handleNext = () => {
    if (selectedTemplate) {
      onNext();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <p className="text-lg font-medium">Failed to load templates</p>
          <p className="text-sm">{error}</p>
        </div>
        <Button onClick={fetchTemplates} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose a Project Template
        </h2>
        <p className="text-gray-600">
          Select a template to get started with your project. Templates provide predefined phases and structure.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplate?.id === template.id}
            onSelect={handleTemplateSelect}
          />
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No templates available</p>
        </div>
      )}

      <div className="flex justify-between pt-6 border-t">
        <Button onClick={onBack} variant="outline">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <Button 
          onClick={handleNext} 
          disabled={!selectedTemplate}
          className="flex items-center"
        >
          Next
          <ArrowRightIcon className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {selectedTemplate && (
        <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
          <h3 className="font-medium text-indigo-900 mb-2">Selected Template</h3>
          <p className="text-sm text-indigo-700">
            <strong>{selectedTemplate.name}</strong> - {selectedTemplate.description}
          </p>
          <p className="text-xs text-indigo-600 mt-1">
            {selectedTemplate.phases.length} phases • {selectedTemplate.methodology} methodology
          </p>
        </div>
      )}
    </div>
  );
};
