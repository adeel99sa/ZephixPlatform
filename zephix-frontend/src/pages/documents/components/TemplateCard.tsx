import React from 'react';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { FileText, Plus, Clock, Users } from 'lucide-react';
import { DocumentTemplate } from '../../../services/documentService';

interface TemplateCardProps {
  template: DocumentTemplate;
  onSelect: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'initiation': return 'bg-blue-100 text-blue-800';
      case 'planning': return 'bg-green-100 text-green-800';
      case 'execution': return 'bg-yellow-100 text-yellow-800';
      case 'closure': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodologyColor = (methodology: string) => {
    switch (methodology) {
      case 'agile': return 'bg-orange-100 text-orange-800';
      case 'waterfall': return 'bg-blue-100 text-blue-800';
      case 'hybrid': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group" onClick={onSelect}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">
              {template.name}
            </h3>
            <p className="text-sm text-gray-500">
              {template.description}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge className={getCategoryColor(template.category)}>
            {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
          </Badge>
          {template.methodology !== 'all' && (
            <Badge className={getMethodologyColor(template.methodology)}>
              {template.methodology.charAt(0).toUpperCase() + template.methodology.slice(1)}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>v{template.version}</span>
            </div>
            {template.isSystem && (
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>System</span>
              </div>
            )}
          </div>
          <div className="text-xs">
            {new Date(template.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </Card>
  );
};


