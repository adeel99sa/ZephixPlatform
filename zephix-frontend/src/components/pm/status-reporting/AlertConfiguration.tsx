import React, { useState } from 'react';

interface AlertConfigurationProps {
  projectId: string;
  onConfigureAlerts: (config: any) => Promise<void>;
}

const AlertConfiguration: React.FC<AlertConfigurationProps> = ({
  projectId,
  onConfigureAlerts,
}) => {
  const [alertConfig, setAlertConfig] = useState({
    scheduleVarianceThreshold: 10,
    budgetVarianceThreshold: 5,
    riskLevelThreshold: 'high',
    stakeholderSatisfactionThreshold: 80,
    notificationChannels: ['email', 'dashboard'],
    escalationHours: 24,
  });

  const handleSaveConfiguration = async () => {
    await onConfigureAlerts(alertConfig);
  };

  return (
    <div className="space-y-6">
      {/* Alert Thresholds */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Alert Thresholds</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schedule Variance Threshold (%)
            </label>
            <input
              type="number"
              value={alertConfig.scheduleVarianceThreshold}
              onChange={(e) =>
                setAlertConfig({ ...alertConfig, scheduleVarianceThreshold: parseInt(e.target.value) })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
            />
            <p className="text-xs text-gray-500 mt-1">Alert when schedule variance exceeds this percentage</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget Variance Threshold (%)
            </label>
            <input
              type="number"
              value={alertConfig.budgetVarianceThreshold}
              onChange={(e) =>
                setAlertConfig({ ...alertConfig, budgetVarianceThreshold: parseInt(e.target.value) })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
            />
            <p className="text-xs text-gray-500 mt-1">Alert when budget variance exceeds this percentage</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Risk Level Threshold
            </label>
            <select
              value={alertConfig.riskLevelThreshold}
              onChange={(e) =>
                setAlertConfig({ ...alertConfig, riskLevelThreshold: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Alert when risk level reaches this threshold</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stakeholder Satisfaction Threshold (%)
            </label>
            <input
              type="number"
              value={alertConfig.stakeholderSatisfactionThreshold}
              onChange={(e) =>
                setAlertConfig({ ...alertConfig, stakeholderSatisfactionThreshold: parseInt(e.target.value) })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
            />
            <p className="text-xs text-gray-500 mt-1">Alert when satisfaction falls below this percentage</p>
          </div>
        </div>
      </div>

      {/* Notification Channels */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Notification Channels</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Primary Channels</h5>
            <div className="space-y-2">
              {['email', 'dashboard', 'slack', 'teams'].map((channel) => (
                <label key={channel} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alertConfig.notificationChannels.includes(channel)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAlertConfig({
                          ...alertConfig,
                          notificationChannels: [...alertConfig.notificationChannels, channel],
                        });
                      } else {
                        setAlertConfig({
                          ...alertConfig,
                          notificationChannels: alertConfig.notificationChannels.filter(c => c !== channel),
                        });
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm capitalize">{channel}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Escalation Settings</h5>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Escalation Time (hours)
                </label>
                <input
                  type="number"
                  value={alertConfig.escalationHours}
                  onChange={(e) =>
                    setAlertConfig({ ...alertConfig, escalationHours: parseInt(e.target.value) })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="168"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Escalation Recipients
                </label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="project-manager">Project Manager</option>
                  <option value="sponsor">Project Sponsor</option>
                  <option value="executive">Executive Team</option>
                  <option value="all">All Stakeholders</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Rules */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Alert Rules</h4>
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">Schedule Variance Alert</h5>
                <p className="text-sm text-gray-600">Triggered when schedule variance exceeds threshold</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
              </div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">Budget Variance Alert</h5>
                <p className="text-sm text-gray-600">Triggered when budget variance exceeds threshold</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
              </div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">Risk Level Alert</h5>
                <p className="text-sm text-gray-600">Triggered when risk level reaches threshold</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
              </div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">Quality Metrics Alert</h5>
                <p className="text-sm text-gray-600">Triggered when quality metrics fall below threshold</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Inactive</span>
                <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Recent Alerts</h4>
        </div>
        <div className="divide-y divide-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h5 className="text-sm font-medium text-gray-900">Schedule Variance Alert</h5>
                <p className="text-sm text-gray-600">Schedule variance exceeded 10% threshold</p>
                <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Warning</span>
                <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h5 className="text-sm font-medium text-gray-900">Risk Level Alert</h5>
                <p className="text-sm text-gray-600">New critical risk identified</p>
                <p className="text-xs text-gray-500 mt-1">1 day ago</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Critical</span>
                <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h5 className="text-sm font-medium text-gray-900">Budget Variance Alert</h5>
                <p className="text-sm text-gray-600">Budget variance within acceptable range</p>
                <p className="text-xs text-gray-500 mt-1">3 days ago</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Resolved</span>
                <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Alert Statistics</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">3</div>
            <div className="text-sm text-gray-600">Critical Alerts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">8</div>
            <div className="text-sm text-gray-600">Warning Alerts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">15</div>
            <div className="text-sm text-gray-600">Resolved Alerts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">2.3h</div>
            <div className="text-sm text-gray-600">Avg Response Time</div>
          </div>
        </div>
      </div>

      {/* Save Configuration */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-900 mb-4">Save Configuration</h4>
        <p className="text-sm text-blue-800 mb-4">
          Save your alert configuration to apply the new thresholds and notification settings
        </p>
        <button
          onClick={handleSaveConfiguration}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Save Alert Configuration
        </button>
      </div>
    </div>
  );
};

export default AlertConfiguration;
