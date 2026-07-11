/**
 * TC-F2 — Use Template multi-step flow.
 * Steps: Name/description → date anchor → capability overrides →
 * ATTACH-GOVERNANCE (skippable, default none) → create → land on defaultView.
 *
 * Live instantiate-v5_1 accepts projectName only; description/startDate go via
 * PATCH /projects/:id; capabilities via PATCH .../capabilities (existing DTO);
 * selected policies via PUT /admin/governance/policies/:code when chosen.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import type { TemplateDto } from '@/features/templates/templates.api';
import { instantiateV51 } from '@/features/templates/api';
import {
  readRecommendedPolicyBundle,
  readRecommendedPolicyCodes,
  resolvePostInstantiateProjectPath,
} from '@/features/templates/template.mapper';
import {
  DEFAULT_PROJECT_CAPABILITIES,
  type ProjectCapabilities,
  patchProjectCapabilities,
} from '@/features/projects/capabilities';
import { api } from '@/lib/api';
import { administrationApi, type WorkspaceGovernancePolicy } from '@/features/administration/api/administration.api';
import { POLICY_UI_META } from '@/features/administration/constants/governance-policies';
import { isPlatformAdmin } from '@/utils/access';
import { useAuth } from '@/state/AuthContext';

type FlowStep = 'name' | 'dates' | 'capabilities' | 'governance';

const STEPS: FlowStep[] = ['name', 'dates', 'capabilities', 'governance'];

const CAP_LABELS: Record<keyof ProjectCapabilities, string> = {
  use_phases: 'Phases',
  use_iterations: 'Iterations',
  use_gates: 'Gates',
  use_wip_limits: 'WIP limits',
};

/** Catalog fallback when GET policies returns empty (e.g. Lean workspace with no rows yet). */
function catalogPoliciesFromMeta(): WorkspaceGovernancePolicy[] {
  return Object.entries(POLICY_UI_META).map(([code, meta]) => ({
    code,
    name: meta.displayName,
    description: meta.description,
    scope: 'workspace',
    severityEffective: 'WARN',
    source: 'disabled' as const,
    isEnabled: false,
  }));
}

export interface UseTemplateFlowModalProps {
  open: boolean;
  template: TemplateDto | null;
  workspaceId: string;
  loading?: boolean;
  error: { code: string; message: string } | null;
  onClose: () => void;
  onSuccess: (projectId: string, template: TemplateDto) => void;
  onError: (err: { code: string; message: string }) => void;
}

export function UseTemplateFlowModal({
  open,
  template,
  workspaceId,
  error,
  onClose,
  onSuccess,
  onError,
}: UseTemplateFlowModalProps) {
  const { user } = useAuth();
  const isAdmin = isPlatformAdmin(user);

  const [step, setStep] = useState<FlowStep>('name');
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [capabilities, setCapabilities] = useState<ProjectCapabilities>({
    ...DEFAULT_PROJECT_CAPABILITIES,
  });
  const [policies, setPolicies] = useState<WorkspaceGovernancePolicy[]>([]);
  const [selectedPolicyCodes, setSelectedPolicyCodes] = useState<string[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const recommendedCodes = useMemo(
    () => (template ? readRecommendedPolicyCodes(template) : []),
    [template],
  );
  const recommendedBundle = useMemo(
    () => (template ? readRecommendedPolicyBundle(template) : null),
    [template],
  );

  /** API rows when present; otherwise full POLICY_UI_META catalog for Lean empty responses. */
  const policyCatalog = useMemo(
    () => (policies.length > 0 ? policies : catalogPoliciesFromMeta()),
    [policies],
  );
  const allPoliciesDisabled =
    policyCatalog.length === 0 || policyCatalog.every((p) => !p.isEnabled);

  const leanGovernanceCopy =
    'No policies are enabled in this workspace (Lean mode). Select policies below to enable them for this workspace';

  useEffect(() => {
    if (!open || !template) return;
    setStep('name');
    setProjectName(template.name || '');
    setDescription('');
    setStartDate('');
    setCapabilities({
      ...(template.capabilities ?? DEFAULT_PROJECT_CAPABILITIES),
    });
    setSelectedPolicyCodes([]);
    setSubmitting(false);
  }, [open, template]);

  useEffect(() => {
    if (!open || !workspaceId || step !== 'governance') return;
    let cancelled = false;
    setPoliciesLoading(true);
    administrationApi
      .listWorkspaceGovernancePolicies(workspaceId)
      .then((rows) => {
        if (!cancelled) setPolicies(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setPolicies([]);
      })
      .finally(() => {
        if (!cancelled) setPoliciesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, workspaceId, step]);

  if (!open || !template) return null;

  const stepIndex = STEPS.indexOf(step);

  const goNext = () => {
    if (step === 'name' && !projectName.trim()) return;
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  };

  const togglePolicy = (code: string) => {
    setSelectedPolicyCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleCreate = async () => {
    if (!projectName.trim()) {
      onError({ code: 'MISSING_PROJECT_NAME', message: 'Project name is required' });
      return;
    }
    if (!workspaceId) {
      onError({
        code: 'WORKSPACE_REQUIRED',
        message: 'A workspace is required to create a project',
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await instantiateV51(template.id, {
        projectName: projectName.trim(),
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        capabilities,
      });

      // Post-create: description + date anchor via existing project PATCH.
      const patchBody: Record<string, string> = {};
      if (description.trim()) patchBody.description = description.trim();
      if (startDate) patchBody.startDate = startDate;
      if (Object.keys(patchBody).length > 0) {
        try {
          await api.patch(`/projects/${result.projectId}`, patchBody);
        } catch {
          toast.message('Project created; date or description could not be saved');
        }
      }

      // Capability overrides via existing UpdateCapabilitiesDto.
      try {
        await patchProjectCapabilities(workspaceId, result.projectId, capabilities);
      } catch {
        // Owner-only endpoint — template copy-down already applied capabilities.
      }

      // ATTACH-GOVERNANCE: enable only explicitly selected policies (default none).
      if (isAdmin && selectedPolicyCodes.length > 0) {
        for (const code of selectedPolicyCodes) {
          try {
            await administrationApi.updateWorkspaceGovernancePolicy(code, {
              workspaceId,
              isEnabled: true,
            });
          } catch {
            // Non-blocking — project already exists.
          }
        }
      }

      onSuccess(result.projectId, template);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { code?: string; message?: string } }; message?: string };
      onError({
        code: e?.response?.data?.code || 'INSTANTIATE_FAILED',
        message:
          e?.response?.data?.message ||
          e?.message ||
          'Failed to create project from template',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const primaryLabel =
    step === 'governance' ? (submitting ? 'Creating…' : 'Create project') : 'Continue';

  return (
    <div className="fixed inset-0 z-[5100] overflow-y-auto" data-testid="use-template-flow-modal">
      <div className="flex min-h-screen items-center justify-center px-4 py-8 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={submitting ? undefined : onClose}
          aria-hidden
        />

        <div className="inline-block w-full max-w-lg transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Use template</h3>
            <p className="mt-1 text-sm text-gray-600 truncate">{template.name}</p>
            <ol className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-slate-500" data-testid="use-template-flow-steps">
              {STEPS.map((s, i) => (
                <li
                  key={s}
                  className={`rounded-full px-2.5 py-0.5 ${
                    s === step ? 'bg-blue-100 text-blue-800' : i < stepIndex ? 'bg-slate-100 text-slate-700' : 'bg-slate-50'
                  }`}
                >
                  {s === 'name'
                    ? 'Name'
                    : s === 'dates'
                      ? 'Dates'
                      : s === 'capabilities'
                        ? 'Capabilities'
                        : 'Governance'}
                </li>
              ))}
            </ol>
          </div>

          <div className="px-6 py-4">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">{error.message}</p>
              </div>
            )}

            {step === 'name' && (
              <div className="space-y-4" data-testid="use-template-step-name">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Project name
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                    data-testid="use-template-name-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Description <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={submitting}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    data-testid="use-template-description-input"
                  />
                </div>
              </div>
            )}

            {step === 'dates' && (
              <div className="space-y-4" data-testid="use-template-step-dates">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Project start date <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    data-testid="use-template-start-date"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Anchors the project timeline. Leave blank to set later.
                  </p>
                </div>
              </div>
            )}

            {step === 'capabilities' && (
              <div className="space-y-3" data-testid="use-template-step-capabilities">
                <p className="text-sm text-slate-600">
                  Adjust methodology capabilities for this project. Defaults come from the template.
                </p>
                {(Object.keys(CAP_LABELS) as Array<keyof ProjectCapabilities>).map((key) => (
                  <label
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-800">{CAP_LABELS[key]}</span>
                    <input
                      type="checkbox"
                      checked={capabilities[key]}
                      onChange={(e) =>
                        setCapabilities((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                      disabled={submitting}
                      data-testid={`use-template-cap-${key}`}
                    />
                  </label>
                ))}
              </div>
            )}

            {step === 'governance' && (
              <div className="space-y-3" data-testid="use-template-step-governance">
                <p className="text-sm text-slate-600">
                  Optionally attach workspace policies. Default is none — skip to keep workspace defaults.
                </p>
                {allPoliciesDisabled ? (
                  <p
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                    data-testid="use-template-governance-lean-copy"
                  >
                    {leanGovernanceCopy}
                  </p>
                ) : null}
                {recommendedBundle ? (
                  <p
                    className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                    data-testid="use-template-governance-recommendation"
                  >
                    Template suggests the {recommendedBundle} policy posture. Nothing is selected by default.
                  </p>
                ) : null}
                {policiesLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : !isAdmin ? (
                  <p
                    className="text-xs text-slate-500"
                    data-testid="use-template-governance-non-admin"
                  >
                    {allPoliciesDisabled
                      ? 'No policies are enabled in this workspace (Lean mode). An admin can enable policies for this workspace.'
                      : 'Policy changes require an admin. You can skip this step.'}
                  </p>
                ) : (
                  <ul
                    className="max-h-56 space-y-2 overflow-y-auto"
                    data-testid="use-template-policy-list"
                  >
                    {policyCatalog.map((p) => {
                      const recommended = recommendedCodes.includes(p.code);
                      return (
                        <li key={p.code}>
                          <label
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                              recommended ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={selectedPolicyCodes.includes(p.code)}
                              onChange={() => togglePolicy(p.code)}
                              disabled={submitting}
                              data-testid={`use-template-policy-${p.code}`}
                            />
                            <span className="min-w-0 flex-1 text-left">
                              <span className="block font-medium text-slate-800">{p.name}</span>
                              <span className="block text-xs text-slate-500">{p.description}</span>
                              {recommended ? (
                                <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                  Recommended
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
            <button
              type="button"
              onClick={stepIndex === 0 ? onClose : goBack}
              disabled={submitting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {stepIndex === 0 ? 'Cancel' : 'Back'}
            </button>
            <div className="flex gap-2">
              {step === 'governance' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPolicyCodes([]);
                    void handleCreate();
                  }}
                  disabled={submitting}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  data-testid="use-template-skip-governance"
                >
                  Skip & create
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (step === 'governance') void handleCreate();
                  else goNext();
                }}
                disabled={submitting || (step === 'name' && !projectName.trim())}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="use-template-flow-primary"
              >
                {primaryLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Re-export helper for tests / callers that navigate after success. */
export { resolvePostInstantiateProjectPath };
