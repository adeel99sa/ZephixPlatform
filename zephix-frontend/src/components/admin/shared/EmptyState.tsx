import React from 'react';
import { AlertCircle, Plus, Search } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  search?: {
    placeholder: string;
    onSearch: (query: string) => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = AlertCircle,
  action,
  search
}) => {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">{description}</p>
      
      {search && (
        <div className="max-w-md mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={search.placeholder}
              onChange={(e) => search.onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      )}
      
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'primary'}
        >
          <Plus className="w-4 h-4 mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  );
};

