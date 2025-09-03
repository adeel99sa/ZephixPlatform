import React from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

interface TemplatePhase {
  id: string;
  name: string;
  order_index: number;
  gate_requirements: any[];
  duration_days?: number;
}

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
  phases: TemplatePhase[];
}

interface TemplateCardProps {
  template: Template;
  isSelected: boolean;
  onSelect: (template: Template) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isSelected,
  onSelect,
}) => {
  const getMethodologyColor = (methodology: string) => {
    switch (methodology.toLowerCase()) {
      case 'waterfall':
        return 'bg-blue-100 text-blue-800';
      case 'scrum':
        return 'bg-green-100 text-green-800';
      case 'agile':
        return 'bg-purple-100 text-purple-800';
      case 'kanban':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodologyIcon = (methodology: string) => {
    switch (methodology.toLowerCase()) {
      case 'waterfall':
        return '🌊';
      case 'scrum':
        return '🏃';
      case 'agile':
        return '⚡';
      case 'kanban':
        return '📋';
      default:
        return '📊';
    }
  };

  return (
    <div
      className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={() => onSelect(template)}
    >
      {isSelected && (
        <div className="absolute top-4 right-4">
          <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
            <CheckIcon className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      <div className="flex items-start space-x-4">
        <div className="text-3xl">{getMethodologyIcon(template.methodology)}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {template.name}
            </h3>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodologyColor(
                template.methodology
              )}`}
            >
              {template.methodology}
            </span>
          </div>

          {template.description && (
            <p className="text-sm text-gray-600 mb-3">
              {template.description}
            </p>
          )}

          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-500">
              <span className="font-medium">Phases:</span>
              <span className="ml-1">{template.phases.length}</span>
            </div>

            {template.phases.length > 0 && (
              <div className="text-xs text-gray-500">
                <div className="font-medium mb-1">Phase Structure:</div>
                <div className="flex flex-wrap gap-1">
                  {template.phases
                    .sort((a, b) => a.order_index - b.order_index)
                    .slice(0, 3)
                    .map((phase) => (
                      <span
                        key={phase.id}
                        className="px-2 py-1 bg-gray-100 rounded text-gray-700"
                      >
                        {phase.name}
                      </span>
                    ))}
                  {template.phases.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                      +{template.phases.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Version {template.version}</span>
              <span>
                {template.is_system ? 'System Template' : 'Custom Template'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
