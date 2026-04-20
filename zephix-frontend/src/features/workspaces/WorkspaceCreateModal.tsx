import { useState, useId, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { X, User, Info, ChevronDown, Check, Building2 } from 'lucide-react';

import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { orgOnboardingStatusQueryKey } from '@/features/organizations/useOrgOnboardingStatusQuery';
import { telemetry } from '@/lib/telemetry';
import { canCreateOrgWorkspace } from '@/utils/access';

import { createWorkspace } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  activationMode?: boolean;
  nextRoute?: string | null;
}

/** Default role for people invited later (UI only until API supports it). Creator is always Workspace Owner. */
type DefaultInviteRole = 'workspace_owner' | 'workspace_member' | 'workspace_viewer';

const DEFAULT_PERMISSION_OPTIONS: {
  value: DefaultInviteRole;
  label: string;
  description: string;
}[] = [
  {
    value: 'workspace_owner',
    label: 'Workspace Owner',
    description:
      'Can create and edit work in this workspace. Can manage workspace settings and members.',
  },
  {
    value: 'workspace_member',
    label: 'Workspace Member',
    description:
      "Can create and edit work in this workspace. Can't manage workspace settings or delete the workspace.",
  },
  {
    value: 'workspace_viewer',
    label: 'Workspace Viewer',
    description: "Read-only. Can't edit workspace content or manage settings.",
  },
];

export function WorkspaceCreateModal({ open, onClose, onCreated, activationMode, nextRoute }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [makePrivate, setMakePrivate] = useState(false);
  const [defaultInviteRole, setDefaultInviteRole] = useState<DefaultInviteRole>('workspace_owner');
  const [permMenuOpen, setPermMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const { user } = useAuth();
  const { setActiveWorkspace } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canUseCreateFlow = canCreateOrgWorkspace(user);
  const permListId = useId();
  const permTriggerRef = useRef<HTMLButtonElement>(null);
  const permMenuRef = useRef<HTMLDivElement>(null);

  const isValidName = name.trim().length >= 2;
  const previewLetter = name.trim().charAt(0).toUpperCase() || 'W';
  const selectedPerm = DEFAULT_PERMISSION_OPTIONS.find((o) => o.value === defaultInviteRole)!;
  const visibility = makePrivate ? ('CLOSED' as const) : ('OPEN' as const);

  useEffect(() => {
    if (!permMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (permMenuRef.current?.contains(t) || permTriggerRef.current?.contains(t)) return;
      setPermMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPermMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [permMenuOpen]);

  if (!open) return null;
  if (!user?.organizationId) {
    console.error('No organizationId; halting per rules');
    return null;
  }

  function handleClose() {
    if (busy) return;
    setName('');
    setDescription('');
    setMakePrivate(false);
    setDefaultInviteRole('workspace_owner');
    setPermMenuOpen(false);
    setErrorText(null);
    onClose();
  }

  function handleUseTemplates() {
    handleClose();
    navigate('/templates');
  }

  async function submit() {
    if (!canUseCreateFlow || !isValidName || busy) return;
    setBusy(true);
    setErrorText(null);

    try {
      const workspace = await createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
      });
      const wsId = workspace.workspaceId;
      const isExplore = Boolean(nextRoute);
      telemetry.track(isExplore ? 'workspace_created_from_explore' : 'activation_workspace_created', {
        organizationId: user?.organizationId,
        workspaceId: wsId,
        activationMode: Boolean(activationMode),
        nextRoute: nextRoute || undefined,
        defaultInviteRole,
      });
      useWorkspaceStore.getState().setSidebarWorkspacePlaceholder({
        id: wsId,
        name: (workspace.name ?? name.trim()) || 'Workspace',
      });
      useWorkspaceStore.getState().bumpWorkspacesDirectory();
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: orgOnboardingStatusQueryKey(user.id) });
      }
      setActiveWorkspace(wsId);
      handleClose();

      if (nextRoute) {
        const separator = nextRoute.includes('?') ? '&' : '?';
        navigate(`${nextRoute}${separator}workspaceId=${wsId}`, { replace: true });
      } else if (activationMode) {
        navigate(`/templates?mode=activation&workspaceId=${wsId}`, { replace: true });
      } else {
        navigate(`/workspaces/${wsId}/home`, { replace: true });
      }
      onCreated(wsId);
    } catch (e) {
      const ax = e as {
        response?: {
          status?: number;
          data?: { message?: unknown; code?: unknown; error?: { message?: string } };
        };
        message?: string;
      };
      const d = ax?.response?.data;
      let msg: string | undefined;
      if (d && typeof d === 'object') {
        const m = (d as { message?: unknown }).message;
        if (typeof m === 'string') msg = m;
        else if (Array.isArray(m)) msg = m.map(String).join('; ');
        else if (d.error && typeof d.error.message === 'string') msg = d.error.message;
        const code = (d as { code?: unknown }).code;
        if (!msg && typeof code === 'string') msg = code;
      }
      if (!msg) msg = typeof ax?.message === 'string' ? ax.message : undefined;
      const displayMsg =
        msg ||
        (ax?.response?.status === 403
          ? 'You do not have permission to create a workspace (organization admin required).'
          : 'Failed to create workspace. Please try again.');
      setErrorText(displayMsg);
      telemetry.track('ui.workspace.create.error', { message: displayMsg });
    } finally {
      setBusy(false);
    }
  }

  const shellClass =
    'w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/15 ring-1 ring-slate-200/90';

  if (!canUseCreateFlow) {
    return (
      <div
        className="fixed inset-0 z-[200] grid place-items-center bg-black/50 p-4 backdrop-blur-[1px]"
        onClick={handleClose}
      >
        <div className={shellClass} data-testid="workspace-create-modal" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <Building2 className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Create Workspace</h2>
                <p className="mt-1 text-sm leading-snug text-slate-500">
                  Only organization administrators can create a workspace.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm leading-relaxed text-slate-600" data-testid="workspace-create-admin-only-message">
              Ask an admin to create a workspace and invite you as{' '}
              <span className="font-medium text-slate-800">Workspace Owner</span>,{' '}
              <span className="font-medium text-slate-800">Workspace Member</span>, or{' '}
              <span className="font-medium text-slate-800">Workspace Viewer</span>.{' '}
              <span className="font-medium text-slate-800">Project Manager</span> is set per project.
            </p>
          </div>
          <div className="flex justify-end border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              data-testid="workspace-cancel"
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={handleClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-black/50 p-4 backdrop-blur-[1px]"
      onClick={handleClose}
    >
      <div
        className={shellClass}
        data-testid="workspace-create-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-create-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0 pr-2">
            <h2 id="workspace-create-title" className="text-xl font-semibold tracking-tight text-slate-900">
              Create Workspace
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              A workspace represents teams, departments, or groups — each with its own projects, tasks, and
              settings.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[min(70vh,560px)] overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            {/* Icon & name — ClickUp-style row */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Icon &amp; name</label>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-base font-semibold text-slate-700"
                  aria-hidden
                >
                  {previewLetter}
                </div>
                <input
                  id="workspace-create-name"
                  data-testid="workspace-name-input"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900/5 transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrorText(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isValidName && !busy) submit();
                  }}
                  placeholder="e.g. Marketing, Engineering, HR"
                  autoFocus
                />
              </div>
              {name.length > 0 && !isValidName && (
                <p className="mt-1.5 text-xs font-medium text-amber-700">Use at least 2 characters</p>
              )}
            </div>

            <div>
              <label htmlFor="workspace-create-desc" className="mb-2 block text-sm font-medium text-slate-800">
                Description <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="workspace-create-desc"
                data-testid="workspace-description-input"
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a short description"
                rows={3}
              />
            </div>

            {/* Default permission — maps ClickUp Full edit / Edit / View only → Owner / Member / Viewer */}
            <div className="relative">
              <div className="mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" aria-hidden />
                <span className="text-sm font-medium text-slate-800">Default permission</span>
                <span
                  className="inline-flex text-slate-400"
                  title="Role for members you invite after this workspace is created. You are always Workspace Owner."
                >
                  <Info className="h-4 w-4" aria-hidden />
                  <span className="sr-only">
                    Role for members you invite after this workspace is created. You are always Workspace Owner.
                  </span>
                </span>
              </div>
              <button
                ref={permTriggerRef}
                type="button"
                data-testid="workspace-default-permission-trigger"
                aria-haspopup="listbox"
                aria-expanded={permMenuOpen}
                aria-controls={permListId}
                onClick={() => setPermMenuOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <span className="font-medium text-slate-900">{selectedPerm.label}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-500 transition ${permMenuOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>

              {permMenuOpen && (
                <div
                  ref={permMenuRef}
                  id={permListId}
                  role="listbox"
                  aria-label="Default permission for invited members"
                  className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                >
                  {DEFAULT_PERMISSION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={defaultInviteRole === opt.value}
                      onClick={() => {
                        setDefaultInviteRole(opt.value);
                        setPermMenuOpen(false);
                      }}
                      className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                        defaultInviteRole === opt.value ? 'bg-slate-50' : ''
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2 font-medium text-slate-900">
                        {opt.label}
                        {defaultInviteRole === opt.value ? (
                          <Check className="h-4 w-4 shrink-0 text-slate-900" aria-hidden />
                        ) : null}
                      </span>
                      <span className="text-xs leading-snug text-slate-500">{opt.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Make Private ↔ CLOSED visibility */}
            <div data-testid="workspace-visibility-select">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">Make Private</div>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500">
                    Only you and invited members have access.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={makePrivate}
                  onClick={() => setMakePrivate((v) => !v)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                    makePrivate ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                      makePrivate ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                  <span className="sr-only">{makePrivate ? 'Private' : 'Open'}</span>
                </button>
              </div>
            </div>

            {errorText && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
                data-testid="workspace-create-error"
              >
                {errorText}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            data-testid="workspace-use-templates"
            className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
            onClick={handleUseTemplates}
            disabled={busy}
          >
            Use Templates
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="workspace-cancel"
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              onClick={handleClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="workspace-create"
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
              onClick={submit}
              disabled={!isValidName || busy}
            >
              {busy ? 'Working…' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
