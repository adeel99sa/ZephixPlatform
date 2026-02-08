import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { telemetry } from '@/lib/telemetry';

import { createWorkspace } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  /** When true, redirect to template selection after creation (activation flow) */
  activationMode?: boolean;
  /** Optional route to navigate to after workspace creation (e.g. from explore tiles) */
  nextRoute?: string | null;
}

type Visibility = 'OPEN' | 'CLOSED';

export function WorkspaceCreateModal({ open, onClose, onCreated, activationMode, nextRoute }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('OPEN');
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const { user } = useAuth();
  const { setActiveWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();

  const isValidName = name.trim().length >= 2;

  if (!open) return null;
  if (!user?.organizationId) {
    console.error('No organizationId; halting per rules');
    return null;
  }

  function handleClose() {
    if (busy) return;
    setName('');
    setDescription('');
    setVisibility('OPEN');
    setErrorText(null);
    onClose();
  }

  async function submit() {
    if (!isValidName || busy) return;
    setBusy(true);
    setErrorText(null);

    try {
      const workspace = await createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
        // No slug — backend generates it from name
      });
      const wsId = workspace.workspaceId;
      const isExplore = Boolean(nextRoute);
      telemetry.track(isExplore ? 'workspace_created_from_explore' : 'activation_workspace_created', {
        organizationId: user?.organizationId,
        workspaceId: wsId,
        activationMode: Boolean(activationMode),
        nextRoute: nextRoute || undefined,
      });
      setActiveWorkspace(wsId);
      handleClose();

      if (nextRoute) {
        // Navigate to the intended route the user was trying to reach
        const separator = nextRoute.includes('?') ? '&' : '?';
        navigate(`${nextRoute}${separator}workspaceId=${wsId}`, { replace: true });
      } else if (activationMode) {
        navigate(`/templates?mode=activation&workspaceId=${wsId}`, { replace: true });
      } else {
        navigate(`/workspaces/${wsId}/home`, { replace: true });
      }
      onCreated(wsId);
    } catch (e) {
      const msg =
        (e as any)?.response?.data?.message ||
        (e as any)?.message ||
        'Failed to create workspace. Please try again.';
      setErrorText(msg);
      telemetry.track('ui.workspace.create.error', { message: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        data-testid="workspace-create-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          <h2 className="text-lg font-semibold text-gray-900">Create workspace</h2>
          <button
            onClick={handleClose}
            disabled={busy}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              data-testid="workspace-name-input"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-colors"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorText(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isValidName && !busy) submit();
              }}
              placeholder="e.g. Design, Engineering, Marketing"
              autoFocus
            />
            {name.length > 0 && !isValidName && (
              <p className="text-xs text-amber-600 mt-1">
                Name must be at least 2 characters
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              data-testid="workspace-description-input"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-colors"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this workspace for?"
              rows={2}
            />
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Permissions
            </label>
            <select
              data-testid="workspace-visibility-select"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-colors"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
            >
              <option value="OPEN">
                Open — Anyone in your organization can find and join
              </option>
              <option value="CLOSED">
                Private — Only invited members can access
              </option>
            </select>
          </div>

          {/* Error display */}
          {errorText && (
            <div
              className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
              data-testid="workspace-create-error"
            >
              {errorText}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            data-testid="workspace-cancel"
            className="rounded-lg px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            onClick={handleClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            data-testid="workspace-create"
            className="rounded-lg px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            onClick={submit}
            disabled={!isValidName || busy}
          >
            {busy ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
