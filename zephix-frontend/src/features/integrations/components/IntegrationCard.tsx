// ─────────────────────────────────────────────────────────────────────────────
// Integration Card — Step 22.6
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Plug, PlugZap, AlertTriangle, Check, X, Pause, Play, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { intentColors } from '@/design/tokens';
import { typography } from '@/design/typography';
import type { IntegrationConnectionItem } from '../integrations.api';

interface IntegrationCardProps {
  connection: IntegrationConnectionItem;
  canWrite: boolean;
  onTest?: () => void;
  onDisable?: () => void;
  onEnable?: () => void;
  onDisconnect?: () => void;
  onViewLogs?: () => void;
}

const PROVIDER_META: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  SLACK: {
    label: 'Slack',
    icon: <PlugZap className="h-5 w-5 text-purple-600" />,
    description: 'Post event notifications to a Slack channel.',
  },
  WEBHOOK: {
    label: 'Webhook',
    icon: <Plug className="h-5 w-5 text-blue-600" />,
    description: 'Forward events via HTTP POST to any endpoint.',
  },
  JIRA: {
    label: 'Jira',
    icon: <Plug className="h-5 w-5 text-blue-500" />,
    description: 'Import projects and issues from Jira.',
  },
};

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  connection,
  canWrite,
  onTest,
  onDisable,
  onEnable,
  onDisconnect,
  onViewLogs,
}) => {
  const meta = PROVIDER_META[connection.provider] || PROVIDER_META.WEBHOOK;

  return (
    <div
      className="bg-white border rounded-lg p-4 space-y-3"
      data-testid={`integration-card-${connection.provider.toLowerCase()}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {meta.icon}
          <div>
            <h3 className={typography.sectionTitle}>{meta.label}</h3>
            <p className={typography.muted}>{meta.description}</p>
          </div>
        </div>
        <StatusBadge status={connection.enabled ? 'ACTIVE' : 'DISABLED'} />
      </div>

      {/* Config details */}
      {connection.config && (
        <div className={`text-xs ${intentColors.neutral.text} space-y-1`}>
          {connection.provider === 'SLACK' && typeof connection.config.channelName === 'string' && (
            <p>Channel: <strong>#{connection.config.channelName}</strong></p>
          )}
          {connection.provider === 'WEBHOOK' && typeof connection.config.endpointUrl === 'string' && (
            <p>Endpoint: <strong>{connection.config.endpointUrl}</strong></p>
          )}
        </div>
      )}

      {/* Error display */}
      {connection.lastError && (
        <div className={`flex items-start gap-2 p-2 rounded ${intentColors.danger.bg} border ${intentColors.danger.border}`}>
          <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 ${intentColors.danger.text}`} />
          <p className={`text-xs ${intentColors.danger.text}`}>{connection.lastError}</p>
        </div>
      )}

      {/* Actions */}
      {canWrite && (
        <div className="flex items-center gap-2 pt-1 border-t">
          {onTest && (
            <button
              onClick={onTest}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            >
              <Check className="h-3 w-3" /> Test
            </button>
          )}
          {connection.enabled && onDisable && (
            <button
              onClick={onDisable}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            >
              <Pause className="h-3 w-3" /> Disable
            </button>
          )}
          {!connection.enabled && onEnable && (
            <button
              onClick={onEnable}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 rounded border hover:bg-green-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            >
              <Play className="h-3 w-3" /> Enable
            </button>
          )}
          {onViewLogs && (
            <button
              onClick={onViewLogs}
              className="px-2.5 py-1.5 text-xs font-medium rounded border hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            >
              Logs
            </button>
          )}
          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 rounded border border-red-200 hover:bg-red-50 ml-auto focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            >
              <Trash2 className="h-3 w-3" /> Disconnect
            </button>
          )}
        </div>
      )}
    </div>
  );
};
