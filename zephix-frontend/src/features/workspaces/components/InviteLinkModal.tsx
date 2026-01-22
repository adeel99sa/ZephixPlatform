/**
 * Invite Link Modal Component
 *
 * State machine:
 * - idle: Initial state
 * - loading-meta: Loading active link metadata
 * - ready: Metadata loaded, can create link
 * - creating: Creating new link
 * - error: Error state
 *
 * Behavior:
 * - GET /workspaces/:id/invite-link returns metadata only (no URL)
 * - POST /workspaces/:id/invite-link returns URL only at creation
 * - URL stored in component state (memory only, not localStorage)
 * - Revoke not available in Sprint 1 (requires linkId from backend)
 */
import { useEffect, useState } from 'react';
import {
  getActiveInviteLink,
  createInviteLink,
  type InviteLinkMeta,
  type CreateInviteLinkResult,
  type ApiError,
} from '../api/workspace-invite.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

type InviteLinkModalState =
  | { status: 'idle'; meta: InviteLinkMeta | null; createdLink: null; error: null }
  | { status: 'loading-meta'; meta: InviteLinkMeta | null; createdLink: null; error: null }
  | { status: 'ready'; meta: InviteLinkMeta | null; createdLink: CreateInviteLinkResult | null; error: null }
  | { status: 'creating'; meta: InviteLinkMeta | null; createdLink: CreateInviteLinkResult | null; error: null }
  | { status: 'error'; meta: InviteLinkMeta | null; createdLink: CreateInviteLinkResult | null; error: ApiError };

interface InviteLinkModalProps {
  open: boolean;
  workspaceId: string;
  onClose: () => void;
}

export function InviteLinkModal({ open, workspaceId, onClose }: InviteLinkModalProps) {
  const [state, setState] = useState<InviteLinkModalState>({
    status: 'idle',
    meta: null,
    createdLink: null,
    error: null,
  });

  // Load metadata when modal opens
  useEffect(() => {
    if (open && workspaceId) {
      loadMeta();
    } else {
      // Reset state when modal closes
      setState({
        status: 'idle',
        meta: null,
        createdLink: null,
        error: null,
      });
    }
  }, [open, workspaceId]);

  async function loadMeta() {
    setState((prev) => ({ ...prev, status: 'loading-meta' }));
    try {
      const meta = await getActiveInviteLink(workspaceId);
      setState({
        status: 'ready',
        meta,
        createdLink: null,
        error: null,
      });
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: error as ApiError,
      }));
      toast.error('Failed to load invite link');
    }
  }

  async function handleCreateLink(expiresInDays?: number) {
    setState((prev) => ({ ...prev, status: 'creating' }));
    try {
      const result = await createInviteLink(workspaceId, { expiresInDays });
      setState((prev) => ({
        status: 'ready',
        meta: prev.meta || { exists: true, expiresAt: result.expiresAt, createdAt: new Date().toISOString() },
        createdLink: result,
        error: null,
      }));
      toast.success('Invite link created');
    } catch (error: any) {
      const apiError = error as ApiError;
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: apiError,
      }));
      toast.error(apiError.message || 'Failed to create invite link');
    }
  }

  function handleCopyUrl() {
    if (!state.createdLink?.url) return;
    navigator.clipboard.writeText(state.createdLink.url);
    toast.success('Link copied to clipboard');
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Invite Link</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {state.status === 'loading-meta' && (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading...</div>
          </div>
        )}

        {state.status === 'error' && (
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">
              {state.error?.message || 'An error occurred'}
            </div>
            <Button onClick={loadMeta} variant="outline">
              Retry
            </Button>
          </div>
        )}

        {state.status === 'ready' && (
          <div className="space-y-4">
            {state.meta && !state.createdLink && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm text-blue-800">
                  An active link exists. For security, the URL is only shown when you create a new link.
                </p>
                {state.meta.expiresAt && (
                  <p className="text-xs text-blue-600 mt-2">
                    Expires: {new Date(state.meta.expiresAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {state.createdLink && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invite Link URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={state.createdLink.url}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                    />
                    <Button onClick={handleCopyUrl} size="sm">
                      Copy
                    </Button>
                  </div>
                </div>

                {state.createdLink.expiresAt && (
                  <p className="text-xs text-gray-500">
                    Expires: {new Date(state.createdLink.expiresAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {!state.createdLink && (
              <div className="text-center text-gray-500 py-4">
                <p className="text-sm mb-4">No active link</p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
              <Button onClick={() => handleCreateLink(30)}>
                {state.meta ? 'Create New Link' : 'Create Link'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
