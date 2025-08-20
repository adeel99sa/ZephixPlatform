import React from 'react';
import { UserPlus, Shield, FileText, Settings, BarChart3, Users } from 'lucide-react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';

export const QuickActionsCard: React.FC = () => {
  const quickActions = [
    {
      icon: UserPlus,
      label: 'Invite User',
      description: 'Add new team member',
      action: () => console.log('Invite user clicked'),
      variant: 'primary' as const
    },
    {
      icon: Shield,
      label: 'Security',
      description: 'Update settings',
      action: () => console.log('Security clicked'),
      variant: 'outline' as const
    },
    {
      icon: FileText,
      label: 'Templates',
      description: 'Manage BRD templates',
      action: () => console.log('Templates clicked'),
      variant: 'outline' as const
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      description: 'View reports',
      action: () => console.log('Analytics clicked'),
      variant: 'outline' as const
    }
  ];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        <Settings className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.action}
              className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
            >
              <Icon className="w-5 h-5 text-gray-600 mb-2" />
              <div className="text-sm font-medium text-gray-900">{action.label}</div>
              <div className="text-xs text-gray-500">{action.description}</div>
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-200">
        <Button variant="outline" size="sm" className="w-full">
          <Users className="w-4 h-4 mr-2" />
          View All Actions
        </Button>
      </div>
    </Card>
  );
};

