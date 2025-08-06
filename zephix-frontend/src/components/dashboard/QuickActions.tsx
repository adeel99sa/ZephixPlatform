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
      <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
      <div className="space-y-3">
        {actions.map(({ id, label, icon: Icon, action }) => (
          <button
            key={id}
            onClick={() => handleAction(action)}
            className="w-full flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
            aria-label={`${label}: ${action}`}
          >
            <Icon className="w-5 h-5 text-indigo-400" aria-hidden="true" />
            <span className="text-sm font-medium text-white">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
