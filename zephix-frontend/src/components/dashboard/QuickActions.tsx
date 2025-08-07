import React from 'react';
import { Plus, FileText, Users, Settings } from 'lucide-react';

interface QuickActionsProps {
  onQuickAction?: (action: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onQuickAction }) => {
  const handleAction = (action: string) => {
    if (onQuickAction) {
      onQuickAction(action);
    }
  };

  const actions = [
    { id: 'create-project', label: 'Create Project', icon: Plus, action: 'Create new project' },
    { id: 'upload-document', label: 'Upload BRD', icon: FileText, action: 'Upload business requirements document' },
    { id: 'invite-team', label: 'Invite Team', icon: Users, action: 'Invite team members' },
    { id: 'settings', label: 'Settings', icon: Settings, action: 'Open settings' }
  ];

  return (
    <div>
      <h3 className="text-lg font-bold tracking-tight text-white mb-3">Quick Actions</h3>
      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.action)}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-all duration-300 hover:scale-[1.015] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label={action.label}
          >
            <action.icon className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
