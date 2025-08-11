import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Users, Settings, Brain, Upload, Workflow, FormInput, Sparkles } from 'lucide-react';

interface QuickActionsProps {
  onQuickAction?: (action: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onQuickAction }) => {
  const navigate = useNavigate();

  const handleAction = (actionId: string, route?: string) => {
    // If there's a route, navigate to it
    if (route) {
      navigate(route);
      return;
    }
    
    // Otherwise, use the legacy callback for actions without routes
    if (onQuickAction) {
      onQuickAction(actionId);
    }
  };

  const actions = [
    { 
      id: 'create-project', 
      label: 'Create Project', 
      icon: Plus, 
      action: 'Create new project',
      route: '/projects'
    },
    { 
      id: 'build-workflow', 
      label: 'Build Workflow', 
      icon: Workflow, 
      action: 'Create workflow template',
      route: '/workflow-templates/builder'
    },
    { 
      id: 'ai-form-designer', 
      label: 'AI Form Designer', 
      icon: Sparkles, 
      action: 'Create forms with AI assistance',
      route: '/intake-forms/ai-designer'
    },
    { 
      id: 'create-intake-form', 
      label: 'Create Intake Form', 
      icon: FormInput, 
      action: 'Create intake form manually',
      route: '/intake-forms/builder'
    },
    { 
      id: 'upload-document', 
      label: 'Upload BRD', 
      icon: Upload, 
      action: 'Upload business requirements document',
      route: '/brd/upload'
    },
    { 
      id: 'document-intelligence', 
      label: 'Document Intelligence', 
      icon: Brain, 
      action: 'Analyze project documents with AI',
      route: '/intelligence'
    },
    { 
      id: 'invite-team', 
      label: 'Invite Team', 
      icon: Users, 
      action: 'Invite team members',
      route: '/organizations/team'
    }
  ];

  return (
    <div>
      <h3 className="text-lg font-bold tracking-tight text-white mb-3">Quick Actions</h3>
      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.id, action.route)}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-all duration-300 hover:scale-[1.015] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label={action.label}
            data-testid={`quick-action-${action.id}`}
          >
            <action.icon className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
