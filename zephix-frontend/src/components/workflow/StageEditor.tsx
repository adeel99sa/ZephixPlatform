import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Zap, 
  Users, 
  Bell,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Mail,
  Webhook,
  UserPlus
} from 'lucide-react';
import { StageEditorProps, WorkflowStage } from '../../types/workflow';
import { Button } from '../ui/Button';

const STAGE_TYPES = [
  { value: 'intake_stage', label: 'Intake Stage', icon: '📥' },
  { value: 'project_phase', label: 'Project Phase', icon: '📁' },
  { value: 'approval_gate', label: 'Approval Gate', icon: '🛡️' },
  { value: 'orr_section', label: 'ORR Section', icon: '✅' },
];

const TRIGGER_OPTIONS = [
  { value: 'stage_enter', label: 'When stage is entered' },
  { value: 'stage_complete', label: 'When stage is completed' },
  { value: 'field_change', label: 'When field value changes' },
  { value: 'approval_received', label: 'When approval is received' },
  { value: 'time_elapsed', label: 'After time period' },
];

const ACTION_OPTIONS = [
  { value: 'move_to_stage', label: 'Move to next stage' },
  { value: 'send_notification', label: 'Send notification' },
  { value: 'assign_user', label: 'Assign to user' },
  { value: 'create_project', label: 'Create project' },
  { value: 'webhook', label: 'Call webhook' },
];

interface TabProps {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  isActive: boolean;
  onClick: () => void;
}

const Tab: React.FC<TabProps> = ({ id, name, icon: Icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-slate-700 text-white'
        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span>{name}</span>
  </button>
);

interface AutomationEditorProps {
  automation: any;
  index: number;
  onUpdate: (index: number, automation: any) => void;
  onRemove: (index: number) => void;
}

const AutomationEditor: React.FC<AutomationEditorProps> = ({
  automation,
  index,
  onUpdate,
  onRemove
}) => {
  const handleUpdate = (field: string, value: any) => {
    onUpdate(index, { ...automation, [field]: value });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">Automation {index + 1}</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="text-red-400 hover:text-red-300"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            When...
          </label>
          <select
            value={automation.trigger || ''}
            onChange={(e) => handleUpdate('trigger', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select trigger</option>
            {TRIGGER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Then...
          </label>
          <select
            value={automation.action || ''}
            onChange={(e) => handleUpdate('action', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select action</option>
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conditional Configuration */}
      {automation.trigger === 'field_change' && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Field Name
          </label>
          <input
            type="text"
            value={automation.conditions?.field || ''}
            onChange={(e) => handleUpdate('conditions', { 
              ...automation.conditions, 
              field: e.target.value 
            })}
            placeholder="Enter field name"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {automation.trigger === 'time_elapsed' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Duration
            </label>
            <input
              type="number"
              value={automation.conditions?.duration || ''}
              onChange={(e) => handleUpdate('conditions', { 
                ...automation.conditions, 
                duration: parseInt(e.target.value) 
              })}
              placeholder="Enter duration"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Unit
            </label>
            <select
              value={automation.conditions?.unit || 'hours'}
              onChange={(e) => handleUpdate('conditions', { 
                ...automation.conditions, 
                unit: e.target.value 
              })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        </div>
      )}

      {automation.action === 'webhook' && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Webhook URL
          </label>
          <input
            type="url"
            value={automation.config?.url || ''}
            onChange={(e) => handleUpdate('config', { 
              ...automation.config, 
              url: e.target.value 
            })}
            placeholder="https://example.com/webhook"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {automation.action === 'send_notification' && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Recipients (comma-separated emails)
          </label>
          <input
            type="text"
            value={automation.config?.recipients?.join(', ') || ''}
            onChange={(e) => handleUpdate('config', { 
              ...automation.config, 
              recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
            })}
            placeholder="user1@example.com, user2@example.com"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}
    </div>
  );
};

export const StageEditor: React.FC<StageEditorProps> = ({
  stage,
  onUpdate,
  onClose,
  availableUsers = []
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [localStage, setLocalStage] = useState<WorkflowStage | null>(stage);

  useEffect(() => {
    setLocalStage(stage);
  }, [stage]);

  if (!localStage) return null;

  const tabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'automations', name: 'Automations', icon: Zap },
    { id: 'approvals', name: 'Approvals', icon: Users },
    { id: 'notifications', name: 'Notifications', icon: Bell },
  ];

  const handleUpdate = (field: keyof WorkflowStage, value: any) => {
    const updatedStage = { ...localStage, [field]: value };
    setLocalStage(updatedStage);
    onUpdate(updatedStage);
  };

  const handleAddAutomation = () => {
    const newAutomation = {
      trigger: '',
      action: '',
      conditions: {},
      config: {}
    };
    handleUpdate('automations', [...localStage.automations, newAutomation]);
  };

  const handleUpdateAutomation = (index: number, automation: any) => {
    const updatedAutomations = [...localStage.automations];
    updatedAutomations[index] = automation;
    handleUpdate('automations', updatedAutomations);
  };

  const handleRemoveAutomation = (index: number) => {
    const updatedAutomations = localStage.automations.filter((_, i) => i !== index);
    handleUpdate('automations', updatedAutomations);
  };

  const handleAddApprover = (approverId: string) => {
    if (!localStage.approvers.includes(approverId)) {
      handleUpdate('approvers', [...localStage.approvers, approverId]);
    }
  };

  const handleRemoveApprover = (approverId: string) => {
    handleUpdate('approvers', localStage.approvers.filter(id => id !== approverId));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white">Configure Stage</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-800 p-1 m-6 rounded-lg">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            id={tab.id}
            name={tab.name}
            icon={tab.icon}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Stage Name
              </label>
              <input
                type="text"
                value={localStage.name}
                onChange={(e) => handleUpdate('name', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter stage name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Stage Type
              </label>
              <select
                value={localStage.type}
                onChange={(e) => handleUpdate('type', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {STAGE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="required"
                checked={localStage.required}
                onChange={(e) => handleUpdate('required', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="required" className="text-sm text-slate-300">
                This stage is required
              </label>
            </div>

            {localStage.required && (
              <div className="flex items-center space-x-2 text-sm text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4" />
                <span>Required stages cannot be skipped in the workflow</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'automations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">Automations</h3>
              <Button size="sm" onClick={handleAddAutomation}>
                <Plus className="w-4 h-4 mr-2" />
                Add Automation
              </Button>
            </div>

            {localStage.automations.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">No Automations</h3>
                <p className="text-slate-500 mb-4">Add automations to trigger actions automatically</p>
                <Button onClick={handleAddAutomation}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Automation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {localStage.automations.map((automation, index) => (
                  <AutomationEditor
                    key={index}
                    automation={automation}
                    index={index}
                    onUpdate={handleUpdateAutomation}
                    onRemove={handleRemoveAutomation}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">Approvers</h3>
              <div className="text-sm text-slate-400">
                {localStage.approvers.length} approver{localStage.approvers.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Add Approver
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddApprover(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select user to add as approver</option>
                {availableUsers
                  .filter(user => !localStage.approvers.includes(user.id))
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
              </select>
            </div>

            {localStage.approvers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">No Approvers</h3>
                <p className="text-slate-500">Add users who can approve this stage</p>
              </div>
            ) : (
              <div className="space-y-2">
                {localStage.approvers.map((approverId) => {
                  const user = availableUsers.find(u => u.id === approverId);
                  return (
                    <div
                      key={approverId}
                      className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg p-3"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {user?.name || approverId}
                          </div>
                          {user?.email && (
                            <div className="text-xs text-slate-400">{user.email}</div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveApprover(approverId)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">Notifications</h3>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Notification
              </Button>
            </div>

            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">No Notifications</h3>
              <p className="text-slate-500 mb-4">Configure email notifications for stage events</p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add First Notification
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
