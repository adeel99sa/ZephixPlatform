import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { workspaceInvitesApi, type ApiError, type CreateInviteLinkResult, type InviteLinkMeta } from '@/features/workspaces/api/workspace-invite.api';

type Props = {
  open: boolean;
  workspaceId: string;
  onClose: () => void;
};

type State =
  | { status: 'idle'; meta: InviteLinkMeta; created: CreateInviteLinkResult | null; error: ApiError | null }
  | { status: 'loading'; meta: InviteLinkMeta; created: CreateInviteLinkResult | null; error: ApiError | null }
  | { status: 'ready'; meta: InviteLinkMeta; created: CreateInviteLinkResult | null; error: ApiError | null }
  | { status: 'creating'; meta: InviteLinkMeta; created: CreateInviteLinkResult | null; error: ApiError | null }
  | { status: 'revoking'; meta: InviteLinkMeta; created: CreateInviteLinkResult | null; error: ApiError | null }
  | { status: 'error'; meta: InviteLinkMeta; created: CreateInviteLinkResult | null; error: ApiError };

function formatDate(iso: string | null | undefined) {
  if (!iso) return 'No expiry';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'No expiry';
  return d.toLocaleString();
}

export default function InviteLinkModal({ open, workspaceId, onClose }: Props) {
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [state, setState] = useState<State>({
    status: 'idle',
    meta: null,
    created: null,
    error: null,
  });

  const showUrl = useMemo(() => {
    return state.created?.url ?? null;
  }, [state.created]);

  useEffect(() => {
    if (!open) return;

    let alive = true;

    (async () => {
      setState((s) => ({ ...s, status: 'loading', error: null }));
      try {
        const meta = await workspaceInvitesApi.getActiveInviteLink(workspaceId);
        if (!alive) return;
        setState((s) => ({ ...s, status: 'ready', meta, error: null }));
      } catch (e) {
        if (!alive) return;
        setState((s) => ({ ...s, status: 'error', error: e as ApiError }));
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, workspaceId]);

  async function onRevoke() {
    setState((s) => ({ ...s, status: 'revoking', error: null }));
    try {
      await workspaceInvitesApi.revokeActiveInviteLink(workspaceId);
      toast.success('Invite link revoked');
      // Refresh metadata - should become null after revoke
      const meta = await workspaceInvitesApi.getActiveInviteLink(workspaceId);
      setState((s) => ({
        status: 'ready',
        meta,
        created: null, // Clear any created link URL
        error: null,
      }));
    } catch (e) {
      const err = e as ApiError;
      setState((s) => ({ ...s, status: 'error', error: err }));
      toast.error(err.message || 'Failed to revoke invite link');
    }
  }

  async function onCreate() {
    setState((s) => ({ ...s, status: 'creating', error: null }));
    try {
      const created = await workspaceInvitesApi.createInviteLink(workspaceId, { expiresInDays });
      setState((s) => ({ ...s, status: 'ready', created, error: null }));
      toast.success('Invite link created');
    } catch (e) {
      const err = e as ApiError;
      setState((s) => ({ ...s, status: 'error', error: err }));
      toast.error(err.message || 'Failed to create invite link');
    }
  }

  async function onCopy() {
    if (!state.created?.url) return;
    try {
      await navigator.clipboard.writeText(state.created.url);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  }

  if (!open) return null;

  const disabled = state.status === 'loading' || state.status === 'creating' || state.status === 'revoking';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Invite link</div>
            <div className="text-sm text-slate-600">Create a link. Copy it once. It is only shown after creation.</div>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {state.meta?.exists ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="font-medium">An active link already exists</div>
              <div className="text-slate-600">You will not see its URL. Create a new one to get a new URL.</div>
              <div className="mt-2 text-slate-600">Expires: {formatDate(state.meta.expiresAt)}</div>
              <div className="text-slate-600">Created: {formatDate(state.meta.createdAt)}</div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              No active invite link found.
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-700">Expiry (days)</label>
            <input
              className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
              type="number"
              min={1}
              max={365}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value || 30))}
              disabled={disabled}
            />
            <div className="text-xs text-slate-500">1 to 365</div>
          </div>

          {showUrl ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">New link</div>
              <div className="flex gap-2">
                <input
                  className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                  value={showUrl}
                  readOnly
                />
                <Button variant="outline" onClick={onCopy}>
                  Copy
                </Button>
              </div>
              <div className="text-xs text-slate-600">Expires: {formatDate(state.created?.expiresAt ?? null)}</div>
            </div>
          ) : null}

          {state.status === 'error' && state.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {state.error.message || 'Something went wrong'}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={disabled}>
            Cancel
          </Button>
          {state.meta?.exists && !showUrl ? (
            <Button variant="outline" onClick={onRevoke} disabled={disabled}>
              {state.status === 'revoking' ? 'Revoking...' : 'Revoke link'}
            </Button>
          ) : null}
          <Button variant="primary" onClick={onCreate} disabled={disabled}>
            {state.status === 'creating' ? 'Creating...' : 'Create new link'}
          </Button>
        </div>
      </div>
    </div>
  );
}
