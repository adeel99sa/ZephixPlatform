// Phase 4.3: Share Dialog with Link Sharing
import { useState, useEffect } from 'react';
import { Copy, Check, Link as LinkIcon } from 'lucide-react';
import { track } from '@/lib/telemetry';
import { useUIStore } from '@/stores/uiStore';
import { enableShare, disableShare } from './api';

type Props = {
  dashboardId: string;
  initialVisibility: 'PRIVATE'|'WORKSPACE'|'ORG';
  initialShareEnabled?: boolean;
  onSave: (v: 'PRIVATE'|'WORKSPACE'|'ORG') => Promise<void> | void;
  onClose: () => void;
};

export default function ShareDialog({ dashboardId, initialVisibility, initialShareEnabled = false, onSave, onClose }: Props) {
  const [visibility, setVisibility] = useState<typeof initialVisibility>(initialVisibility);
  const [shareEnabled, setShareEnabled] = useState(initialShareEnabled);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [expiryDays, setExpiryDays] = useState<number | null>(null); // null = never expires
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  // Load share URL if share is enabled
  useEffect(() => {
    if (shareEnabled && !shareUrl) {
      // Share URL will be set after enabling share
      const url = new URL(window.location.href);
      url.pathname = `/dashboards/${dashboardId}`;
      // Token will be added after enableShare call
      setShareUrl(url.toString());
    }
  }, [shareEnabled, dashboardId, shareUrl]);

  const handleToggleShare = async () => {
    setLoading(true);
    try {
      if (!shareEnabled) {
        // Enable sharing
        const expiresAt = expiryDays
          ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
          : undefined;
        const result = await enableShare(dashboardId, expiresAt);
        setShareUrl(result.shareUrlPath ? `${window.location.origin}${result.shareUrlPath}` : '');
        setShareEnabled(true);
        track('ui.dashboard.share.enable', { dashboardId, expiryDays });
        addToast({ type: 'success', title: 'Share link enabled' });
      } else {
        // Disable sharing
        await disableShare(dashboardId);
        setShareEnabled(false);
        setShareUrl('');
        track('ui.dashboard.share.disable', { dashboardId });
        addToast({ type: 'success', title: 'Share link disabled' });
      }
    } catch (error: any) {
      console.error('Failed to toggle share:', error);
      addToast({ type: 'error', title: 'Failed to update sharing settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      track('ui.dashboard.share.copy', { dashboardId });
      addToast({ type: 'success', title: 'Link copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const save = async () => {
    await onSave(visibility);
    track('ui.dashboard.share.save', { visibility });
    addToast({ type: 'success', title: 'Visibility updated' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" data-testid="share-dialog">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="z-10 w-[520px] rounded-xl bg-white p-4 shadow-xl">
        <div className="mb-2 text-base font-semibold">Share & Visibility</div>
        <div className="mb-4 text-sm text-neutral-600">Choose who can view this dashboard.</div>

        {/* Visibility Options */}
        <div className="mb-6 space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="v" value="PRIVATE" checked={visibility==='PRIVATE'} onChange={() => setVisibility('PRIVATE')} />
            Private (only you)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="v" value="WORKSPACE" checked={visibility==='WORKSPACE'} onChange={() => setVisibility('WORKSPACE')} />
            Workspace (members)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="v" value="ORG" checked={visibility==='ORG'} onChange={() => setVisibility('ORG')} />
            Organization (all)
          </label>
        </div>

        {/* Share Link Section */}
        <div className="mb-6 border-t pt-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Share Link</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={shareEnabled}
                onChange={handleToggleShare}
                disabled={loading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {shareEnabled && (
            <div className="space-y-3">
              {/* Expiry Selector */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Link expires</label>
                <select
                  value={expiryDays === null ? 'never' : expiryDays.toString()}
                  onChange={(e) => setExpiryDays(e.target.value === 'never' ? null : parseInt(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="never">Never</option>
                </select>
              </div>

              {/* Share URL */}
              {shareUrl && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    data-testid="share-copy-link"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Anyone with this link can view the dashboard in read-only mode.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button className="rounded-md px-3 py-1 text-sm hover:bg-neutral-100" onClick={onClose}>Cancel</button>
          <button className="rounded-md bg-neutral-900 px-3 py-1 text-sm text-white hover:bg-black" onClick={save} data-testid="share-save">Save</button>
        </div>
      </div>
    </div>
  );
}
