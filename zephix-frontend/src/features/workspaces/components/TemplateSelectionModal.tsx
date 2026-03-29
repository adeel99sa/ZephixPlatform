import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/state/workspace.store';
import { createProject } from '@/features/projects/api';
import {
  createProjectFromTemplate,
  listTemplates,
} from '@/features/templates/api';
import { listWorkspaces, type Workspace } from '@/features/workspaces/api';
import type { CanonicalTemplate } from '@/features/templates/types';
import type { TemplateImportOptions } from '@/features/templates/types';
import { TemplateCard, type TemplateCardData } from './TemplateCard';
import './TemplateSelectionModal.css';

const DEFAULT_IMPORT: TemplateImportOptions = {
  includeViews: true,
  includeTasks: true,
  includePhases: true,
  includeMilestones: true,
  includeCustomFields: false,
  includeDependencies: false,
  remapDates: true,
};

// Map CanonicalTemplate to card-friendly format
function toTemplateCardData(t: CanonicalTemplate): TemplateCardData {
  const phases = t.seedPhases?.length ?? t.executionConfiguration?.views?.length ?? 3;
  const tasks = t.seedTasks?.length ?? 5;
  const views =
    t.includedViews?.map((v) => v.charAt(0).toUpperCase() + v.slice(1)) ??
    t.executionConfiguration?.views?.map((v) => v.charAt(0).toUpperCase() + v.slice(1)) ??
    ['List', 'Board', 'Gantt'];
  return {
    id: t.id,
    name: t.name,
    description: t.description || '',
    previewImage: t.previewImage,
    structure: { phases, tasks, views },
  };
}

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedWorkspaceId?: string;
  /** Called after successful project creation (before navigation) */
  onSuccess?: (projectId: string, workspaceId?: string) => void;
}

export function TemplateSelectionModal({
  isOpen,
  onClose,
  preselectedWorkspaceId,
  onSuccess,
}: TemplateSelectionModalProps) {
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceStore();

  const [templates, setTemplates] = useState<TemplateCardData[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateCardData | null>(null);
  const [projectName, setProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState(
    preselectedWorkspaceId || activeWorkspaceId || ''
  );

  // Load templates and workspaces when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setSelectedTemplate(null);
    setProjectName('');
    setTargetWorkspaceId(preselectedWorkspaceId || activeWorkspaceId || '');
    setLoading(true);

    Promise.all([listTemplates().catch(() => []), listWorkspaces()])
      .then(([apiTemplates, ws]) => {
        setTemplates(apiTemplates.map(toTemplateCardData));
        setWorkspaces(ws);
        if (!preselectedWorkspaceId && !activeWorkspaceId && ws[0]?.id) {
          setTargetWorkspaceId(ws[0].id);
        }
      })
      .catch(() => {
        toast.error('Failed to load templates');
        setTemplates([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, preselectedWorkspaceId, activeWorkspaceId]);

  // BUG FIX: Don't auto-fill template name — always start empty
  const handleTemplateSelect = (template: TemplateCardData) => {
    setSelectedTemplate(template);
    setProjectName('');
  };

  const handleCreateProject = async () => {
    if (!projectName.trim() || !targetWorkspaceId) {
      toast.error('Project name and workspace are required');
      return;
    }

    const isBlankProject = !selectedTemplate || !selectedTemplate.id;

    setIsCreating(true);
    try {
      if (selectedTemplate && selectedTemplate.id) {
        const created = await createProjectFromTemplate({
          templateId: selectedTemplate.id,
          workspaceId: targetWorkspaceId,
          projectName: projectName.trim(),
          importOptions: DEFAULT_IMPORT,
        });
        onSuccess?.(created.id, created.workspaceId);
        // BUG FIX: Redirect to new project immediately
        navigate(`/projects/${created.id}`);
        onClose();
      } else if (isBlankProject) {
        const project = await createProject({
          name: projectName.trim(),
          workspaceId: targetWorkspaceId,
        });
        onSuccess?.(project.id, targetWorkspaceId);
        navigate(`/projects/${project.id}`);
        onClose();
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to create project';
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="template-modal-overlay" onClick={onClose}>
      <div
        className="template-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-modal-title"
      >
        {!selectedTemplate ? (
          <>
            <h2 id="template-modal-title" className="text-xl font-semibold text-slate-900">
              Choose a template
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Start with a pre-built structure
            </p>

            {loading ? (
              <div className="mt-8 flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : (
              <div className="template-grid mt-6">
                {templates.length === 0 ? (
                  <div className="col-span-full rounded-lg border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-sm text-slate-600">
                    No templates available. Start from scratch by entering a project name in the
                    workspace.
                  </div>
                ) : (
                  templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={handleTemplateSelect}
                    />
                  ))
                )}
              </div>
            )}

            <div className="mt-6 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate({
                    id: '',
                    name: 'Blank',
                    description: 'Empty project to build from scratch',
                    structure: { phases: 0, tasks: 0, views: ['List', 'Board'] },
                  });
                  setProjectName('');
                }}
                className="text-sm text-slate-600 underline hover:text-slate-900"
              >
                Or start from scratch (no template)
              </button>
            </div>
          </>
        ) : (
          <div className="template-config">
            <button
              type="button"
              onClick={() => setSelectedTemplate(null)}
              className="mb-4 flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to templates
            </button>

            {selectedTemplate.id ? (
              <div className="template-preview-header mb-8">
                {selectedTemplate.previewImage ? (
                  <img
                    src={selectedTemplate.previewImage}
                    alt={selectedTemplate.name}
                    className="mb-4 max-h-32 w-full max-w-md rounded-lg object-cover"
                  />
                ) : null}
                <h3 className="text-lg font-semibold text-slate-900">{selectedTemplate.name}</h3>
                <p className="text-sm text-slate-600">{selectedTemplate.description}</p>
              </div>
            ) : (
              <div className="template-preview-header mb-8">
                <h3 className="text-lg font-semibold text-slate-900">Start from scratch</h3>
                <p className="text-sm text-slate-600">
                  Create an empty project and add phases and tasks as you go.
                </p>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="project-name">Project name *</label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., Q3 Cloud Migration, Website Redesign"
                className="form-input"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="workspace-select">Workspace</label>
              <select
                id="workspace-select"
                value={targetWorkspaceId}
                onChange={(e) => setTargetWorkspaceId(e.target.value)}
                disabled={!!preselectedWorkspaceId}
                className="form-input"
              >
                <option value="">Select a workspace</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                    {preselectedWorkspaceId === ws.id ? ' (current)' : ''}
                  </option>
                ))}
              </select>
              {preselectedWorkspaceId && (
                <small className="mt-1 block text-xs text-slate-500">
                  Pre-selected from sidebar
                </small>
              )}
            </div>

            <div className="actions mt-8">
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={!projectName.trim() || isCreating}
                className="btn-primary"
              >
                {isCreating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
