import React from 'react';
import { X } from 'lucide-react';

interface ContextPanelProps {
  children: React.ReactNode;
  title?: string;
  onClose?: () => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ 
  children, 
  title = 'Context Panel',
  onClose 
}) => {
  return (
    <aside className="w-[360px] bg-white border-l border-gray-200 min-h-screen fixed right-0 top-16">
      <div className="p-6">
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">{title}</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </aside>
  );
};

