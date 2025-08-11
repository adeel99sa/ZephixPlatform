import React from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const IntegrationsPage: React.FC = () => {
  const integrations = [
    {
      id: 'jira',
      name: 'Jira',
      description: 'Project management and issue tracking',
      status: 'connected',
      lastSync: '2 hours ago',
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Team communication and notifications',
      status: 'connected',
      lastSync: '30 minutes ago',
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      description: 'Team collaboration and video conferencing',
      status: 'disconnected',
      lastSync: null,
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Version control and code repository',
      status: 'connected',
      lastSync: '1 hour ago',
    },
    {
      id: 'gitlab',
      name: 'GitLab',
      description: 'DevOps platform and CI/CD',
      status: 'error',
      lastSync: '1 day ago',
    },
    {
      id: 'azure-devops',
      name: 'Azure DevOps',
      description: 'Project management and DevOps tools',
      status: 'connected',
      lastSync: '4 hours ago',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'disconnected':
        return <XCircleIcon className="w-5 h-5 text-gray-400" />;
      case 'error':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'connected':
        return 'connected';
      case 'disconnected':
        return 'disconnected';
      case 'error':
        return 'error';
      default:
        return 'pending';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Integrations</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="bg-white rounded-lg shadow p-6"
              data-testid={`integration-${integration.id}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                <div 
                  className={`connection-status ${getStatusClass(integration.status)}`}
                  data-testid="connection-status"
                >
                  {getStatusIcon(integration.status)}
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">{integration.description}</p>
              
              {integration.lastSync && (
                <p className="text-xs text-gray-500 mb-4" data-testid="last-sync-time">
                  Last synced: {integration.lastSync}
                </p>
              )}
              
              <div className="flex space-x-2">
                {integration.status === 'connected' ? (
                  <>
                    <button
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded hover:bg-blue-100"
                      data-testid="test-connection-btn"
                    >
                      Test Connection
                    </button>
                    <button
                      className="flex-1 px-3 py-2 bg-gray-50 text-gray-600 text-sm font-medium rounded hover:bg-gray-100"
                      data-testid="disconnect-btn"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                    data-testid="configure-btn"
                  >
                    Configure
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow p-6" data-testid="integration-health-summary">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Integration Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900" data-testid="total-integrations-count">6</p>
              <p className="text-sm text-gray-600">Total Integrations</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600" data-testid="active-integrations-count">4</p>
              <p className="text-sm text-gray-600">Active</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600" data-testid="failed-integrations-count">1</p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-600" data-testid="disconnected-integrations-count">1</p>
              <p className="text-sm text-gray-600">Disconnected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;