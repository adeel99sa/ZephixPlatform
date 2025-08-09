import React from 'react';
import { IntakeForm } from '../../types/workflow';
import { Button } from '../ui/Button';
import { 
  Settings, 
  Globe, 
  Lock, 
  Bell, 
  Zap, 
  Users,
  Mail,
  Webhook,
  Plus,
  Trash2
} from 'lucide-react';

interface FormSettingsProps {
  form: IntakeForm;
  onUpdate: (updates: Partial<IntakeForm>) => void;
}

export const FormSettings: React.FC<FormSettingsProps> = ({
  form,
  onUpdate
}) => {
  const handleSettingsUpdate = (field: string, value: any) => {
    onUpdate({
      settings: {
        ...form.settings,
        [field]: value
      }
    });
  };

  const handleNotificationEmailsUpdate = (emailsString: string) => {
    const emails = emailsString.split(',').map(email => email.trim()).filter(Boolean);
    handleSettingsUpdate('emailNotifications', emails);
  };

  const handleWebhookAdd = () => {
    const webhooks = form.settings.integrations?.customWebhooks || [];
    handleSettingsUpdate('integrations', {
      ...form.settings.integrations,
      customWebhooks: [
        ...webhooks,
        {
          name: 'New Webhook',
          url: '',
          headers: {}
        }
      ]
    });
  };

  const handleWebhookUpdate = (index: number, updates: any) => {
    const webhooks = [...(form.settings.integrations?.customWebhooks || [])];
    webhooks[index] = { ...webhooks[index], ...updates };
    handleSettingsUpdate('integrations', {
      ...form.settings.integrations,
      customWebhooks: webhooks
    });
  };

  const handleWebhookDelete = (index: number) => {
    const webhooks = form.settings.integrations?.customWebhooks || [];
    handleSettingsUpdate('integrations', {
      ...form.settings.integrations,
      customWebhooks: webhooks.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      {/* Access Settings */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4 flex items-center">
          <Lock className="w-4 h-4 mr-2" />
          Access Settings
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={form.isPublic}
                onChange={(e) => onUpdate({ isPublic: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="isPublic" className="text-sm text-slate-300 flex items-center">
                <Globe className="w-3 h-3 mr-1" />
                Public Form
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requireLogin"
                checked={form.settings.requireLogin}
                onChange={(e) => handleSettingsUpdate('requireLogin', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="requireLogin" className="text-sm text-slate-300">
                Require Login
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowAnonymous"
                checked={form.settings.allowAnonymous}
                onChange={(e) => handleSettingsUpdate('allowAnonymous', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="allowAnonymous" className="text-sm text-slate-300">
                Allow Anonymous Submissions
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="text-xs text-slate-400 space-y-1">
            <p><strong>Public:</strong> Form can be accessed via public URL</p>
            <p><strong>Require Login:</strong> Users must be logged in to submit</p>
            <p><strong>Anonymous:</strong> Allow submissions without user accounts</p>
          </div>
        </div>
      </div>

      {/* Confirmation Settings */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Confirmation Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Confirmation Message
            </label>
            <textarea
              value={form.settings.confirmationMessage}
              onChange={(e) => handleSettingsUpdate('confirmationMessage', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Thank you for your submission!"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Redirect URL (optional)
            </label>
            <input
              type="url"
              value={form.settings.redirectUrl || ''}
              onChange={(e) => handleSettingsUpdate('redirectUrl', e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/thank-you"
            />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4 flex items-center">
          <Bell className="w-4 h-4 mr-2" />
          Notifications
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Email Notifications (comma-separated)
            </label>
            <input
              type="text"
              value={form.settings.emailNotifications.join(', ')}
              onChange={(e) => handleNotificationEmailsUpdate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin@company.com, manager@company.com"
            />
            <p className="text-xs text-slate-500 mt-1">
              These emails will be notified when a new submission is received
            </p>
          </div>
        </div>
      </div>

      {/* Auto-Assignment */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4 flex items-center">
          <Users className="w-4 h-4 mr-2" />
          Auto-Assignment
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoAssignEnabled"
                checked={form.settings.autoAssign?.enabled || false}
                onChange={(e) => handleSettingsUpdate('autoAssign', {
                  ...form.settings.autoAssign,
                  enabled: e.target.checked
                })}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="autoAssignEnabled" className="text-sm text-slate-300">
                Enable Auto-Assignment
              </label>
            </div>
          </div>

          {form.settings.autoAssign?.enabled && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Default Assignee
              </label>
              <input
                type="text"
                value={form.settings.autoAssign?.assignTo || ''}
                onChange={(e) => handleSettingsUpdate('autoAssign', {
                  ...form.settings.autoAssign,
                  assignTo: e.target.value
                })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="User ID or email"
              />
            </div>
          )}
        </div>
      </div>

      {/* Integrations */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4 flex items-center">
          <Zap className="w-4 h-4 mr-2" />
          Integrations
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Slack Webhook URL
            </label>
            <input
              type="url"
              value={form.settings.integrations?.slackWebhook || ''}
              onChange={(e) => handleSettingsUpdate('integrations', {
                ...form.settings.integrations,
                slackWebhook: e.target.value
              })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Microsoft Teams Webhook URL
            </label>
            <input
              type="url"
              value={form.settings.integrations?.teamsWebhook || ''}
              onChange={(e) => handleSettingsUpdate('integrations', {
                ...form.settings.integrations,
                teamsWebhook: e.target.value
              })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://outlook.office.com/webhook/..."
            />
          </div>

          {/* Custom Webhooks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300">
                Custom Webhooks
              </label>
              <Button
                size="sm"
                onClick={handleWebhookAdd}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>

            {form.settings.integrations?.customWebhooks?.map((webhook, index) => (
              <div key={index} className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={webhook.name}
                    onChange={(e) => handleWebhookUpdate(index, { name: e.target.value })}
                    className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Webhook name"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleWebhookDelete(index)}
                    className="text-red-400 hover:text-red-300 ml-2"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <input
                  type="url"
                  value={webhook.url}
                  onChange={(e) => handleWebhookUpdate(index, { url: e.target.value })}
                  className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="https://api.example.com/webhook"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Analytics */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Analytics</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="text-lg font-bold text-white">{form.analytics.totalViews}</div>
            <div className="text-xs text-slate-400">Total Views</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="text-lg font-bold text-green-400">{form.analytics.totalSubmissions}</div>
            <div className="text-xs text-slate-400">Submissions</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="text-lg font-bold text-blue-400">{form.analytics.conversionRate.toFixed(1)}%</div>
            <div className="text-xs text-slate-400">Conversion Rate</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="text-lg font-bold text-purple-400">{form.submissionCount || 0}</div>
            <div className="text-xs text-slate-400">Active Forms</div>
          </div>
        </div>
      </div>

      {/* Form Status */}
      <div className="pt-4 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-white">Form Status</h4>
            <p className="text-xs text-slate-400">
              {form.isActive ? 'Form is live and accepting submissions' : 'Form is disabled'}
            </p>
          </div>
          <div className={`w-3 h-3 rounded-full ${form.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate({ isActive: !form.isActive })}
            className="text-xs"
          >
            {form.isActive ? 'Disable Form' : 'Enable Form'}
          </Button>
        </div>
      </div>
    </div>
  );
};
