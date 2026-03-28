// ─────────────────────────────────────────────────────────────────────────────
// Slack Connect Panel — Step 22.6
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, PlugZap } from 'lucide-react';
import { typography } from '@/design/typography';
import { connectSlack } from '../integrations.api';

interface SlackConnectPanelProps {
  workspaceId: string;
  onConnected: () => void;
}

export const SlackConnectPanel: React.FC<SlackConnectPanelProps> = ({
  workspaceId,
  onConnected,
}) => {
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [channelName, setChannelName] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!botToken.trim() || !channelId.trim()) {
      toast.error('Bot token and channel ID are required.');
      return;
    }

    setConnecting(true);
    try {
      const result = await connectSlack(workspaceId, botToken, channelId, channelName || undefined);
      toast.success(`Slack connected to ${result.teamName || 'workspace'}`);
      onConnected();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to connect Slack.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4" data-testid="slack-connect-panel">
      <div className="flex items-center gap-2">
        <PlugZap className="h-5 w-5 text-purple-600" />
        <h3 className={typography.sectionTitle}>Connect Slack</h3>
      </div>

      <p className={typography.muted}>
        Paste a Slack Bot Token with <code>chat:write</code> scope. Zephix will post event
        notifications to the specified channel.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Bot Token</label>
          <input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="xoxb-..."
            className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            data-testid="slack-bot-token"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Channel ID</label>
          <input
            type="text"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="C0123456789"
            className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            data-testid="slack-channel-id"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Channel Name (optional)</label>
          <input
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="#general"
            className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <button
          onClick={handleConnect}
          disabled={connecting || !botToken.trim() || !channelId.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          data-testid="slack-connect-btn"
        >
          {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
          {connecting ? 'Connecting...' : 'Connect Slack'}
        </button>
      </div>
    </div>
  );
};
