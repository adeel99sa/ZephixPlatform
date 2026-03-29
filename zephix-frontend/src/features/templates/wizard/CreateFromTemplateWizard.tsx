import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listWorkspaces, type Workspace } from '@/features/workspaces/api';
import { createProject } from '@/features/projects/api';
import { createProjectFromTemplate, getTemplateDetail, listTemplates } from '../api';
import { buildTemplateWorkflow, isPersistedTemplateId } from '../hooks/useTemplateCreation';
import type {
  CanonicalTemplate,
  TemplateImportOptions,
} from '../types';
import { useWorkspaceStore } from '@/state/workspace.store';

type WizardStep = 1 | 2 | 3 | 4 | 5;

const DEFAULT_IMPORT_OPTIONS: TemplateImportOptions = {
  includeViews: true,
  includeTasks: true,
  includePhases: true,
  includeMilestones: true,
  includeCustomFields: false,
  includeDependencies: false,
  remapDates: true,
};

export default function CreateFromTemplateWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [templates, setTemplates] = useState<CanonicalTemplate[]>([]);

  const requestedWorkspaceId = searchParams.get('workspaceId') || '';
  const [workspaceId, setWorkspaceId] = useState<string>(
    requestedWorkspaceId || activeWorkspaceId || '',
  );
  const [templateId, setTemplateId] = useState<string>(searchParams.get('templateId') || '');
  const [projectName, setProjectName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [importOptions, setImportOptions] = useState<TemplateImportOptions>(DEFAULT_IMPORT_OPTIONS);
  const [importMode, setImportMode] = useState<'all' | 'custom'>('all');

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === templateId) || null,
    [templates, templateId],
  );
  const selectedWorkspace = useMemo(
    () => workspaces.find((item) => item.id === workspaceId) || null,
    [workspaces, workspaceId],
  );
  const visibleTemplates = useMemo(() => {
    const allowlist = selectedWorkspace?.allowedTemplateIds || [];
    if (Array.isArray(allowlist) && allowlist.length > 0) {
      return templates.filter((template) => allowlist.includes(template.id));
    }
    return templates;
  }, [templates, selectedWorkspace]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [workspaceRows, templateRows] = await Promise.all([
          listWorkspaces(),
          listTemplates(),
        ]);
        if (!mounted) return;
        setWorkspaces(workspaceRows);
        setTemplates(templateRows);

        if (requestedWorkspaceId) {
          const validRequestedWorkspace = workspaceRows.find(
            (item) => item.id === requestedWorkspaceId,
          );
          if (validRequestedWorkspace) {
            setWorkspaceId(validRequestedWorkspace.id);
          }
        } else if (!workspaceId && workspaceRows[0]?.id) {
          setWorkspaceId(workspaceRows[0].id);
        }
        if (templateId && !templateRows.some((item) => item.id === templateId)) {
          setTemplateId('');
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Failed to load wizard data');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!templateId) return;
    getTemplateDetail(templateId)
      .then((detail) => {
        setImportOptions(detail.defaultImportOptions || DEFAULT_IMPORT_OPTIONS);
      })
      .catch(() => {});
  }, [templateId]);

  useEffect(() => {
    if (!selectedWorkspace) return;
    const allowlist = selectedWorkspace.allowedTemplateIds || [];
    const hasAllowlist = Array.isArray(allowlist) && allowlist.length > 0;
    if (hasAllowlist && templateId && !allowlist.includes(templateId)) {
      setTemplateId('');
      setError('Selected template is not allowed for this workspace.');
      return;
    }
    if (!templateId && selectedWorkspace.defaultTemplateId) {
      const defaultTemplateVisible =
        !hasAllowlist || allowlist.includes(selectedWorkspace.defaultTemplateId);
      if (defaultTemplateVisible) {
        setTemplateId(selectedWorkspace.defaultTemplateId);
      }
    }
  }, [selectedWorkspace, templateId]);

  function canContinue(): boolean {
    if (step === 1) return !!workspaceId;
    if (step === 2) return true;
    if (step === 3) return projectName.trim().length > 0;
    return true;
  }

  async function handleSubmit() {
    if (!workspaceId || !projectName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      setActiveWorkspace(workspaceId);
      if (!templateId) {
        const project = await createProject({
          name: projectName.trim(),
          workspaceId,
        });
        window.dispatchEvent(
          new CustomEvent('project:created', {
            detail: { projectId: project.id, workspaceId },
          }),
        );
        navigate(`/projects/${project.id}`);
        return;
      }

      const workflow =
        selectedTemplate && isPersistedTemplateId(templateId)
          ? buildTemplateWorkflow(selectedTemplate)
          : undefined;
      const created = await createProjectFromTemplate({
        templateId,
        workspaceId,
        projectName: projectName.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        importOptions,
        ...(workflow ? { workflow } : {}),
      });
      window.dispatchEvent(
        new CustomEvent('project:created', {
          detail: { projectId: created.id, workspaceId },
        }),
      );
      navigate(`/projects/${created.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading project wizard...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Project</h1>
        <p className="text-sm text-gray-500">Step {step} of 5</p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 1 && (
        <section className="space-y-3">
          <h2 className="font-medium">Step 1 · Choose workspace</h2>
          <select
            value={workspaceId}
            onChange={(event) => setWorkspaceId(event.target.value)}
            className="w-full rounded border px-3 py-2"
          >
            <option value="">Select workspace</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3">
          <h2 className="font-medium">Step 2 · Choose template</h2>
          <button
            onClick={() => setTemplateId('')}
            className={`w-full rounded border p-3 text-left ${
              templateId ? 'hover:bg-gray-50' : 'border-blue-600 bg-blue-50'
            }`}
          >
            Blank Project
          </button>
          {visibleTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => setTemplateId(template.id)}
              className={`w-full rounded border p-3 text-left ${
                templateId === template.id ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{template.name}</div>
              <div className="text-sm text-gray-500">{template.description}</div>
              {selectedWorkspace?.defaultTemplateId === template.id && (
                <div className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  Workspace default
                </div>
              )}
            </button>
          ))}
          {visibleTemplates.length === 0 && (
            <p className="text-sm text-gray-500">
              No templates are available in this workspace due to template restrictions.
            </p>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3">
          <h2 className="font-medium">Step 3 · Project details</h2>
          <input
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Project name"
            className="w-full rounded border px-3 py-2"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              className="rounded border px-3 py-2"
            />
            <input
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              className="rounded border px-3 py-2"
            />
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-3">
          <h2 className="font-medium">Step 4 · Customize import</h2>
          {!selectedTemplate ? (
            <p className="text-sm text-gray-500">
              Blank project selected. Import options are not required.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="rounded border p-3">
                <label className="mr-4 inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={importMode === 'all'}
                    onChange={() => {
                      setImportMode('all');
                      setImportOptions(DEFAULT_IMPORT_OPTIONS);
                    }}
                  />
                  Import everything
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={importMode === 'custom'}
                    onChange={() => setImportMode('custom')}
                  />
                  Customize import items
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(importOptions).map(([key, value]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                  >
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      disabled={importMode === 'all'}
                      onChange={(event) =>
                        setImportOptions((prev) => ({
                          ...prev,
                          [key]: event.target.checked,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {step === 5 && (
        <section className="space-y-3">
          <h2 className="font-medium">Step 5 · Review and create</h2>
          <div className="rounded border bg-gray-50 p-3 text-sm">
            <div>Workspace: {workspaces.find((item) => item.id === workspaceId)?.name || '—'}</div>
            <div>Template: {selectedTemplate?.name || 'Blank Project'}</div>
            <div>Project name: {projectName || '—'}</div>
          </div>
          {selectedTemplate && (
            <div className="rounded border border-indigo-100 bg-indigo-50 p-3 text-sm">
              <p className="font-medium text-indigo-900">Governance summary</p>
              <ul className="mt-2 space-y-1 text-indigo-800">
                <li>
                  Capacity policy: {selectedTemplate.governanceConfiguration.capacityPolicy}
                </li>
                <li>Budget policy: {selectedTemplate.governanceConfiguration.budgetPolicy}</li>
                <li>
                  Risk model: {selectedTemplate.governanceConfiguration.riskModel}
                </li>
                <li>
                  Required artifacts:{' '}
                  {selectedTemplate.governanceConfiguration.requiredArtifacts.join(', ') || 'None'}
                </li>
              </ul>
            </div>
          )}
        </section>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((prev) => (Math.max(1, prev - 1) as WizardStep))}
          disabled={step === 1 || submitting}
          className="rounded border px-4 py-2 text-sm disabled:opacity-50"
        >
          Back
        </button>
        {step < 5 ? (
          <button
            onClick={() => setStep((prev) => (Math.min(5, prev + 1) as WizardStep))}
            disabled={!canContinue() || submitting}
            className="rounded bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !projectName.trim()}
            className="rounded bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create project'}
          </button>
        )}
      </div>
    </div>
  );
}
