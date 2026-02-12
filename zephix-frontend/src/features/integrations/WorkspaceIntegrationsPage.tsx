// ─────────────────────────────────────────────────────────────────────────────
// Workspace Integrations Page — Step 22.6
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Plug, Plus, ChevronDown } from 'lucide-react';
import { PageLoadingState } from '@/components/ui/states/PageLoadingState';
import { EmptyStateCard } from '@/components/ui/states/EmptyStateCard';
import { typography } from '@/design/typography';
import { spacing } from '@/design/spacing';
import { trackBeta } from '@/lib/telemetry';
import { IntegrationCard } from './components/IntegrationCard';
import { SlackConnectPanel } from './components/SlackConnectPanel';
import { WebhookPanel } from './components/WebhookPanel';
import { JiraImportPanel } from './components/JiraImportPanel';
import {
  listConnections,
  testSlack,
  disableConnection,
  enableConnection,
  deleteConnection,
  type IntegrationConnectionItem,
} from './integrations.api';

type AddPanel = 'slack' | 'webhook' | 'jira-import' | null;

export const WorkspaceIntegrationsPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [connections, setConnections] = useState<IntegrationConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addPanel, setAddPanel] = useState<AddPanel>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const fetchConnections = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await listConnections(workspaceId);
      setConnections(data);
    } catch {
      // Fail silently — empty state handles it
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchConnections();
    if (workspaceId) trackBeta('USER_OPENED_INTEGRATIONS', workspaceId);
  }, [fetchConnections]);

  const handleTest = async (conn: IntegrationConnectionItem) => {
    if (!workspaceId) return;
    if (conn.provider === 'SLACK') {
      try {
        const result = await testSlack(workspaceId);
        if (result.connected) {
          toast.success('Slack connection is healthy.');
        } else {
          toast.error(`Slack test failed: ${result.error}`);
        }
        fetchConnections();
      } catch {
        toast.error('Failed to test Slack connection.');
      }
    }
  };

  const handleDisable = async (conn: IntegrationConnectionItem) => {
    try {
      await disableConnection(conn.id);
      toast.success(`${conn.provider} integration disabled.`);
      fetchConnections();
    } catch {
      toast.error('Failed to disable connection.');
    }
  };

  const handleEnable = async (conn: IntegrationConnectionItem) => {
    try {
      await enableConnection(conn.id);
      toast.success(`${conn.provider} integration enabled.`);
      fetchConnections();
    } catch {
      toast.error('Failed to enable connection.');
    }
  };

  const handleDisconnect = async (conn: IntegrationConnectionItem) => {
    try {
      await deleteConnection(conn.id);
      toast.success(`${conn.provider} integration removed.`);
      fetchConnections();
    } catch {
      toast.error('Failed to remove connection.');
    }
  };

  const handleConnected = () => {
    setAddPanel(null);
    fetchConnections();
  };

  // Check if a Jira connection (legacy) exists for import
  const jiraConnection = connections.find(
    (c) => c.provider === 'JIRA' || (c.provider as string) === 'jira',
  );

  const hasSlack = connections.some((c) => c.provider === 'SLACK');
  const hasWebhook = connections.some((c) => c.provider === 'WEBHOOK');

  if (loading) return <PageLoadingState />;

  return (
    <div className={spacing.page} data-testid="integrations-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Plug className="h-5 w-5 text-slate-600" />
          <h1 className={typography.pageTitle}>Integrations</h1>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            <Plus className="h-4 w-4" />
            Add Integration
            <ChevronDown className="h-3 w-3" />
          </button>

          {showAddMenu && (
            <div className="absolute right-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-10 py-1">
              {!hasSlack && (
                <button
                  onClick={() => { setAddPanel('slack'); setShowAddMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Slack
                </button>
              )}
              {!hasWebhook && (
                <button
                  onClick={() => { setAddPanel('webhook'); setShowAddMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Webhook
                </button>
              )}
              {jiraConnection && (
                <button
                  onClick={() => { setAddPanel('jira-import'); setShowAddMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Import from Jira
                </button>
              )}
              {hasSlack && hasWebhook && !jiraConnection && (
                <p className="px-4 py-2 text-xs text-slate-500">All integrations connected.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active connections */}
      {connections.length > 0 && (
        <div className="space-y-3 mb-6">
          {connections
            .filter((c) => ['SLACK', 'WEBHOOK'].includes(c.provider))
            .map((conn) => (
              <IntegrationCard
                key={conn.id}
                connection={conn}
                canWrite={true}
                onTest={() => handleTest(conn)}
                onDisable={() => handleDisable(conn)}
                onEnable={() => handleEnable(conn)}
                onDisconnect={() => handleDisconnect(conn)}
              />
            ))}
        </div>
      )}

      {/* Empty state */}
      {connections.filter((c) => ['SLACK', 'WEBHOOK'].includes(c.provider)).length === 0 &&
        !addPanel && (
          <EmptyStateCard
            title="No integrations connected"
            description="Connect Slack, webhooks, or import from Jira to keep your team informed."
          />
        )}

      {/* Connect panels */}
      {addPanel === 'slack' && workspaceId && (
        <SlackConnectPanel workspaceId={workspaceId} onConnected={handleConnected} />
      )}

      {addPanel === 'webhook' && workspaceId && (
        <WebhookPanel workspaceId={workspaceId} onConnected={handleConnected} />
      )}

      {addPanel === 'jira-import' && workspaceId && jiraConnection && (
        <JiraImportPanel workspaceId={workspaceId} connectionId={jiraConnection.id} />
      )}
    </div>
  );
};

export default WorkspaceIntegrationsPage;
