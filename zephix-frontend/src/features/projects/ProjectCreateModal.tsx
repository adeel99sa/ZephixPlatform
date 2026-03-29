import { useState, useEffect } from 'react';

import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { telemetry } from '@/lib/telemetry';
import { apiClient } from '@/lib/api/client';

import { createProject } from './api';
import {
  createProjectFromTemplate,
  listTemplates as listMvpTemplates,
} from '@/features/templates/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  workspaceId?: string;
}

interface TemplateSummary {
  id: string;
  name: string;
  complexity?: string;
  description?: string;
}

function TemplateSelector({onSelect}:{onSelect:(id:string|null)=>void}){
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState<string>("");

  useEffect(()=>{
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const mvp = await listMvpTemplates().catch(() => []);
        const response = await apiClient.get('/templates/published').catch(
          () => null,
        );
        const payload = response ? (response as any)?.data ?? response : null;
        const raw = payload ? (payload as any)?.data ?? payload : [];
        const activeTemplates = mvp.length
          ? mvp.map((t) => ({
              id: t.id,
              name: t.name,
              complexity: t.complexity,
              description: t.description || '',
            }))
          : (Array.isArray(raw) ? raw : []).map((t: any) => ({
              id: t.id,
              name: t.name,
              complexity: t.complexity || null,
              description: t.description || '',
            }));
        setTemplates(activeTemplates);
      } catch (err) {
        console.error('Failed to load templates:', err);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  },[]);

  const selected = templates.find(t => t.id === value);

  return (
    <div className="mb-4">
      <label className="block mb-2 text-sm font-medium text-gray-700">Template (optional)</label>
      <select
        data-testid="project-template-select"
        className="w-full rounded border px-3 py-2"
        value={value}
        onChange={(e)=>{ setValue(e.target.value); onSelect(e.target.value || null); }}
        disabled={loading}
      >
        <option value="">Start from scratch</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {loading && <span className="text-xs text-gray-500 mt-1">Loading templates...</span>}
      {selected?.description && (
        <p className="text-xs text-gray-500 mt-1">{selected.description}</p>
      )}
    </div>
  );
}

export function ProjectCreateModal({ open, onClose, onCreated, workspaceId }: Props) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaceStore();

  // Use prop workspaceId if provided, otherwise fall back to active workspace
  const effectiveWorkspaceId = workspaceId || activeWorkspaceId;

  if (!open) return null;
  if (!user?.organizationId) {
    console.error('No organizationId; halting per rules');
    return null;
  }

  async function submit() {
    if (!name.trim() || !effectiveWorkspaceId) return;
    setBusy(true);
    try {
      if (selectedTemplateId) {
        const created = await createProjectFromTemplate({
          templateId: selectedTemplateId,
          workspaceId: effectiveWorkspaceId,
          projectName: name,
          importOptions: {
            includeViews: true,
            includeTasks: true,
            includePhases: true,
            includeMilestones: true,
            includeCustomFields: false,
            includeDependencies: false,
            remapDates: true,
          },
        });
        const projectId = created?.id;
        telemetry.track('project.create.templateSelected', { projectId, templateId: selectedTemplateId });

        // Emit event to invalidate KPI cache in dashboards
        if (effectiveWorkspaceId) {
          window.dispatchEvent(new CustomEvent('project:created', {
            detail: { projectId, workspaceId: effectiveWorkspaceId }
          }));
        }

        if (projectId) onCreated(projectId);
      } else {
        // Use regular project creation
        const project = await createProject({
          name,
          workspaceId: effectiveWorkspaceId,
        });
        telemetry.track('project.create.blank', { projectId: project.id });

        // Emit event to invalidate KPI cache in dashboards
        if (effectiveWorkspaceId) {
          window.dispatchEvent(new CustomEvent('project:created', {
            detail: { projectId: project.id, workspaceId: effectiveWorkspaceId }
          }));
        }

        onCreated(project.id);
      }

      onClose();
    } catch (e: any) {
      telemetry.track('ui.project.create.error', { message: (e as Error).message });

      // Show user-friendly error messages based on error code
      const errorCode = e?.response?.data?.code;
      const errorMessage = e?.response?.data?.message || e?.message;

      let userMessage = 'Failed to create project';

      if (errorCode === 'MISSING_WORKSPACE_ID') {
        userMessage = 'Please select a workspace to create the project in.';
      } else if (errorCode === 'MISSING_PROJECT_NAME') {
        userMessage = 'Please enter a project name.';
      } else if (errorCode === 'MISSING_ORGANIZATION_ID') {
        userMessage = 'Organization context is missing. Please refresh and try again.';
      } else if (errorCode === 'TEMPLATE_INSTANTIATION_FAILED' || errorCode === 'TEMPLATE_APPLY_FAILED') {
        userMessage = errorMessage || 'Failed to create project. Please try again or contact support.';
      } else if (errorMessage) {
        userMessage = errorMessage;
      }

      alert(userMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" data-testid="project-create-modal">
        <h2 className="text-lg font-semibold mb-4">Create project</h2>

        {!effectiveWorkspaceId ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Please select a workspace first</p>
            <button
              className="rounded px-4 py-2 border"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <label className="block mb-2 text-sm">Name</label>
            <input
              data-testid="project-name-input"
              className="w-full rounded border px-3 py-2 mb-4"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Project name..."
            />
            <TemplateSelector onSelect={setSelectedTemplateId} />
            <div className="flex items-center justify-end gap-2">
              <button
                data-testid="project-cancel"
                className="rounded px-4 py-2 border"
                onClick={onClose}
                disabled={busy}
              >Cancel</button>
              <button
                data-testid="project-create"
                className="rounded px-4 py-2 bg-black text-white disabled:opacity-50"
                onClick={submit}
                disabled={busy || !name.trim()}
              >{busy ? 'Creating…' : 'Create'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

