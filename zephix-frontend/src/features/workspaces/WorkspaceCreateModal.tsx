import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Globe,
  Lock,
  X,
} from 'lucide-react';

import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { telemetry } from '@/lib/telemetry';

import { createWorkspace } from './api';
import { getWorkspaceDashboardRoute } from '@/features/navigation/workspace-routes';
import {
  useTemplateCenterModalStore,
  WORKSPACE_CREATE_NEXT_TEMPLATE_CENTER,
} from '@/state/templateCenterModal.store';

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

// ── Permission levels (ClickUp-style) ──
// These map to a default workspace member role concept.
// Backend currently stores visibility; defaultPermission is stored as defaultMethodology
// field repurposed, or as a future field. For now we map it client-side.
type PermissionLevel = 'full_edit' | 'edit' | 'comment' | 'view_only';

const PERMISSION_OPTIONS: {
  id: PermissionLevel;
  label: string;
  description: string;
}[] = [
  {
    id: 'full_edit',
    label: 'Full edit',
    description: 'Can edit settings, create, move, and delete items',
  },
  {
    id: 'edit',
    label: 'Edit',
    description: 'Can edit items but not Space-level settings',
  },
  {
    id: 'comment',
    label: 'Comment',
    description: 'Can view items and add comments only',
  },
  {
    id: 'view_only',
    label: 'View only',
    description: 'Can view items but cannot make any changes',
  },
];

// Icon presets — first letter of workspace name, with color options
const ICON_COLORS = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
];

export function WorkspaceCreateModal({ open, onClose, onCreated, activationMode, nextRoute }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('OPEN');
  const [permission, setPermission] = useState<PermissionLevel>('full_edit');
  const [iconColor, setIconColor] = useState(ICON_COLORS[0]);
  const [permDropdownOpen, setPermDropdownOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const { user } = useAuth();
  const { setActiveWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const permBtnRef = useRef<HTMLButtonElement>(null);
  const permMenuRef = useRef<HTMLDivElement>(null);
  const iconBtnRef = useRef<HTMLButtonElement>(null);
  const iconMenuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isValidName = name.trim().length >= 2;
  const isPrivate = visibility === 'CLOSED';
  const iconLetter = name.trim().charAt(0).toUpperCase() || 'S';

  // Focus name input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!permDropdownOpen && !iconPickerOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        permDropdownOpen &&
        !permMenuRef.current?.contains(target) &&
        !permBtnRef.current?.contains(target)
      ) {
        setPermDropdownOpen(false);
      }
      if (
        iconPickerOpen &&
        !iconMenuRef.current?.contains(target) &&
        !iconBtnRef.current?.contains(target)
      ) {
        setIconPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [permDropdownOpen, iconPickerOpen]);

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (permDropdownOpen) {
          setPermDropdownOpen(false);
        } else if (iconPickerOpen) {
          setIconPickerOpen(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, permDropdownOpen, iconPickerOpen]);

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
    setPermission('full_edit');
    setIconColor(ICON_COLORS[0]);
    setPermDropdownOpen(false);
    setIconPickerOpen(false);
    setErrorText(null);
    onClose();
  }

  const selectedPermOption = PERMISSION_OPTIONS.find((o) => o.id === permission)!;

  async function submit() {
    if (!isValidName || busy) return;
    setBusy(true);
    setErrorText(null);

    try {
      const workspace = await createWorkspace({
        name: name.trim(),
        visibility,
        description: description.trim() || undefined,
      });
      const wsId = workspace.workspaceId;
      const isExplore = Boolean(nextRoute);
      telemetry.track(isExplore ? 'workspace_created_from_explore' : 'activation_workspace_created', {
        organizationId: user?.organizationId,
        workspaceId: wsId,
        activationMode: Boolean(activationMode),
        nextRoute: nextRoute || undefined,
        defaultPermission: permission,
      });
      setActiveWorkspace(wsId);
      handleClose();

      if (nextRoute === WORKSPACE_CREATE_NEXT_TEMPLATE_CENTER) {
        navigate('/home', { replace: true });
        useTemplateCenterModalStore.getState().openTemplateCenter(wsId);
      } else if (nextRoute) {
        const separator = nextRoute.includes('?') ? '&' : '?';
        navigate(`${nextRoute}${separator}workspaceId=${wsId}`, { replace: true });
      } else {
        navigate(getWorkspaceDashboardRoute(wsId), { replace: true });
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
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl"
        data-testid="workspace-create-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-1">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Create a Space</h2>
            <p className="mt-0.5 text-[13px] leading-snug text-slate-500">
              A Space represents teams, departments, or groups, each with its own projects, workflows, and settings.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={busy}
            className="ml-4 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* ── Icon & Name ── */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
              Icon & name
            </label>
            <div className="flex items-center gap-3">
              {/* Icon selector */}
              <div className="relative">
                <button
                  ref={iconBtnRef}
                  type="button"
                  onClick={() => setIconPickerOpen((v) => !v)}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white text-sm font-bold transition-shadow hover:ring-2 hover:ring-slate-300 ${iconColor}`}
                  aria-label="Change icon color"
                >
                  {iconLetter}
                </button>

                {iconPickerOpen ? (
                  <div
                    ref={iconMenuRef}
                    className="absolute left-0 top-full z-50 mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
                  >
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Color
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {ICON_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setIconColor(color);
                            setIconPickerOpen(false);
                          }}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs font-bold transition-all ${color} ${
                            iconColor === color
                              ? 'ring-2 ring-offset-1 ring-slate-400'
                              : 'hover:scale-110'
                          }`}
                        >
                          {iconLetter}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Name input */}
              <input
                ref={nameInputRef}
                data-testid="workspace-name-input"
                className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrorText(null);
                }}
                placeholder="e.g. Marketing, Engineering, Client Delivery"
              />
            </div>
            {name.length > 0 && !isValidName && (
              <p className="mt-1 text-xs text-amber-600">
                Name must be at least 2 characters
              </p>
            )}
          </div>

          {/* ── Description ── */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
              Description <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-colors resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this space for?"
            />
          </div>

          {/* ── Default Permission ── */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
              Default permission
            </label>
            <div className="relative">
              <button
                ref={permBtnRef}
                type="button"
                onClick={() => setPermDropdownOpen((v) => !v)}
                className={`flex h-10 w-full items-center justify-between rounded-lg border px-3 text-sm transition-colors ${
                  permDropdownOpen
                    ? 'border-blue-400 ring-2 ring-blue-100'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <span className="text-slate-900">{selectedPermOption.label}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    permDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {permDropdownOpen ? (
                <div
                  ref={permMenuRef}
                  className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                  {PERMISSION_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setPermission(opt.id);
                        setPermDropdownOpen(false);
                      }}
                      className={`flex w-full flex-col px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${
                        permission === opt.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${
                          permission === opt.id ? 'text-blue-700' : 'text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className="mt-0.5 text-xs text-slate-500">
                        {opt.description}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Make Private toggle ── */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isPrivate}
              onClick={() => setVisibility(isPrivate ? 'OPEN' : 'CLOSED')}
              className={`mt-0.5 relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                isPrivate ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                  isPrivate ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {isPrivate ? (
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                ) : (
                  <Globe className="h-3.5 w-3.5 text-slate-500" />
                )}
                <span className="text-sm font-medium text-slate-900">
                  Make Private
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {isPrivate
                  ? 'Only you and invited members have access'
                  : 'All organization members can see this space'}
              </p>
            </div>
          </div>

          {/* ── Error ── */}
          {errorText && (
            <div
              className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
              data-testid="workspace-create-error"
            >
              {errorText}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            data-testid="workspace-cancel"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            onClick={handleClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            data-testid="workspace-create"
            className="rounded-lg px-5 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            onClick={submit}
            disabled={!isValidName || busy}
          >
            {busy ? 'Creating...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
