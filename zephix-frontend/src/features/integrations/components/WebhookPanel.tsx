// ─────────────────────────────────────────────────────────────────────────────
// Webhook Connect Panel — Step 22.6
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plug } from 'lucide-react';
import { typography } from '@/design/typography';
import { INTEGRATION_V1_EVENT_LABELS } from '../integration-events';
import { connectWebhook } from '../integrations.api';

interface WebhookPanelProps {
  workspaceId: string;
  onConnected: () => void;
}

export const WebhookPanel: React.FC<WebhookPanelProps> = ({
  workspaceId,
  onConnected,
}) => {
  const [endpointUrl, setEndpointUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const handleConnect = async () => {
    if (!endpointUrl.trim()) {
      toast.error('Endpoint URL is required.');
      return;
    }

    setConnecting(true);
    try {
      await connectWebhook(
        workspaceId,
        endpointUrl,
        secret || undefined,
        selectedEvents.length > 0 ? selectedEvents : undefined,
      );
      toast.success('Webhook connected successfully.');
      onConnected();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to connect webhook.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4" data-testid="webhook-connect-panel">
      <div className="flex items-center gap-2">
        <Plug className="h-5 w-5 text-blue-600" />
        <h3 className={typography.sectionTitle}>Connect Webhook</h3>
      </div>

      <p className={typography.muted}>
        Forward Zephix events to Teams, ServiceNow, or any custom endpoint via HTTP POST.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Endpoint URL</label>
          <input
            type="url"
            value={endpointUrl}
            onChange={(e) => setEndpointUrl(e.target.value)}
            placeholder="https://hooks.example.com/zephix"
            className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            data-testid="webhook-endpoint-url"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            HMAC Secret (optional)
          </label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Signing secret for payload verification"
            className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">
            Events (leave empty for all)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {Object.entries(INTEGRATION_V1_EVENT_LABELS).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(key)}
                  onChange={() => toggleEvent(key)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={connecting || !endpointUrl.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          data-testid="webhook-connect-btn"
        >
          {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
          {connecting ? 'Connecting...' : 'Connect Webhook'}
        </button>
      </div>
    </div>
  );
};
