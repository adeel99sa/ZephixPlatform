// ─────────────────────────────────────────────────────────────────────────────
// Guided Setup Panel — Phase 4.8
//
// Shows admin users what setup steps remain for their workspace.
// Members see a simple dashboard-ready view.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  SlidersHorizontal,
  Shield,
  LayoutTemplate,
  FolderPlus,
  Loader2,
  Rocket,
} from 'lucide-react';
import {
  getWorkspaceSetupStatus,
  type WorkspaceSetupStatus,
} from './onboarding-setup.api';
import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';

const STEPS = [
  {
    key: 'tailoringConfigured' as const,
    label: 'Configure tailoring profile',
    description: 'Set your delivery approach and governance mode',
    icon: SlidersHorizontal,
    link: (wsId: string) => `/workspaces/${wsId}/settings?tab=tailoring`,
  },
  {
    key: 'policiesApplied' as const,
    label: 'Apply policies',
    description: 'Apply tailoring to workspace policies',
    icon: Shield,
    link: (wsId: string) => `/workspaces/${wsId}/settings?tab=policies`,
  },
  {
    key: 'templatesActivated' as const,
    label: 'Activate templates',
    description: 'Enable project and governance templates',
    icon: LayoutTemplate,
    link: (_wsId: string) => '/templates',
  },
  {
    key: 'projectCreated' as const,
    label: 'Create first project',
    description: 'Start your first project from a template',
    icon: FolderPlus,
    link: (_wsId: string) => '/projects',
  },
];

export function GuidedSetupPanel() {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaceStore();
  const navigate = useNavigate();
  const isAdmin =
    user?.platformRole === 'ADMIN' ||
    user?.platformRole === 'OWNER' ||
    user?.platformRole === 'admin' ||
    user?.platformRole === 'owner';

  const [status, setStatus] = useState<WorkspaceSetupStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getWorkspaceSetupStatus();
      setStatus(data);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!status || status.isComplete) {
    return null; // Don't show setup panel when complete
  }

  // Members see simple message
  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          Your workspace is being set up. Your admin is configuring the
          environment. You'll see your tasks and inbox here once ready.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border bg-white p-6 space-y-4"
      data-testid="guided-setup-panel"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
          <Rocket className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Set up your workspace
          </h3>
          <p className="text-sm text-gray-500">
            {status.completedCount} of {status.totalCount} steps completed
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-indigo-600 h-2 rounded-full transition-all"
          style={{
            width: `${(status.completedCount / status.totalCount) * 100}%`,
          }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {STEPS.map((step) => {
          const done = status.steps[step.key];
          const Icon = step.icon;
          return (
            <div
              key={step.key}
              onClick={() =>
                !done &&
                activeWorkspaceId &&
                navigate(step.link(activeWorkspaceId))
              }
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                done
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer'
              }`}
            >
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
              )}
              <Icon
                className={`h-4 w-4 flex-shrink-0 ${done ? 'text-green-500' : 'text-gray-400'}`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${done ? 'text-green-700 line-through' : 'text-gray-900'}`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {!done && (
                <span className="text-xs text-indigo-600 font-medium">
                  Start &rarr;
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
