import { PreviewResponse } from '../api';
import type { TemplateDto } from '../templates.api';
import { isTemplateOriginMetadata } from '../template-origin';
import { useWorkspaceStore } from '@/state/workspace.store';
import { PHASE5_1_COPY } from '@/constants/phase5_1.copy';

import { deriveSetupLevel } from '../template.mapper';

function previewSetupLabel(
  phaseCount: number,
  taskCount: number,
): 'Simple' | 'Standard' | 'Rich' | 'Advanced' {
  return deriveSetupLevel({
    id: '',
    name: '',
    kind: 'project',
    templateScope: 'SYSTEM',
    isDefault: false,
    isSystem: true,
    isActive: true,
    lockState: 'UNLOCKED',
    version: 1,
    createdAt: '',
    updatedAt: '',
    defaultEnabledKPIs: [],
    phases: Array.from({ length: phaseCount }, () => ({ name: 'p', order: 0 })),
    task_templates: Array.from({ length: taskCount }, () => ({ name: 't', phaseOrder: 0 })),
  });
}

/** Short audience line — template category + methodology, no fake personas. */
function bestForLine(template: TemplateDto | null | undefined, methodology?: string): string {
  if (!template) {
    return methodology
      ? `Teams using a ${methodology} delivery rhythm for structured project work.`
      : 'Teams that want a structured Zephix project with phases and governed tasks.';
  }
  const cat = template.category?.trim();
  const meth = methodology || template.methodology;
  if (cat && meth) return `${cat} workstreams using ${meth} execution.`;
  if (cat) return `${cat} programs and projects.`;
  if (meth) return `Teams standardizing on ${meth} delivery.`;
  return 'Teams that need a clear phase model and governed execution in Zephix.';
}

interface TemplatePreviewModalProps {
  open: boolean;
  loading: boolean;
  error: { code: string; message: string } | null;
  data: PreviewResponse | null;
  /** Phase 4 (Template Center): source template for creator/source attribution. */
  template?: TemplateDto | null;
  onClose: () => void;
  onUseTemplate: () => void;
}

export function TemplatePreviewModal({
  open,
  loading,
  error,
  data,
  template,
  onClose,
  onUseTemplate,
}: TemplatePreviewModalProps) {
  const { isReadOnly, canWrite } = useWorkspaceStore();
  /** Instantiate is owner/delivery_owner-gated; plain workspace_member must not see an active Use CTA. */
  const canInstantiate = canWrite && !isReadOnly;

  if (!open) return null;

  const methodology = template?.methodology;
  const setupLevel =
    data != null
      ? previewSetupLabel(data.phaseCount, data.taskCount)
      : undefined;

  return (
    <div className="fixed inset-0 z-[5100] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
          aria-hidden
        />

        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-preview-title"
        >
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900" id="template-preview-title">
              {data?.templateName || template?.name || 'Template preview'}
            </h2>
            {template?.description?.trim() && (
              <p className="mt-2 text-sm text-gray-600 leading-snug" data-testid="template-preview-description">
                {template.description.trim()}
              </p>
            )}
            {template && (() => {
              const origin = isTemplateOriginMetadata(template.metadata)
                ? template.metadata
                : null;
              return (
                <div
                  className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600"
                  data-testid="template-preview-attribution"
                >
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                    {template.templateScope === 'SYSTEM'
                      ? 'Created by Zephix'
                      : template.templateScope === 'WORKSPACE'
                        ? 'Workspace template'
                        : template.templateScope}
                  </span>
                  {methodology && (
                    <span
                      className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-800 capitalize"
                      data-testid="template-preview-methodology-badge"
                    >
                      {methodology}
                    </span>
                  )}
                  {setupLevel && (
                    <span
                      className="rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-800"
                      data-testid="template-preview-setup-badge"
                    >
                      {setupLevel}
                    </span>
                  )}
                  {template.category && (
                    <span className="text-slate-500">{template.category}</span>
                  )}
                  {origin?.sourceProjectName && (
                    <span>
                      From project:{' '}
                      <span className="font-medium text-slate-800">
                        {origin.sourceProjectName}
                      </span>
                    </span>
                  )}
                  {template.createdByDisplayName &&
                    template.templateScope !== 'SYSTEM' && (
                      <span>
                        Saved by{' '}
                        <span className="font-medium text-slate-800">
                          {template.createdByDisplayName}
                        </span>
                      </span>
                    )}
                </div>
              );
            })()}
          </div>

          <div className="bg-white px-6 py-4">
            {loading && (
              <div className="py-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <p className="mt-4 text-gray-600">Loading preview…</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{error.message}</p>
              </div>
            )}

            {!loading && !error && data && (
              <div
                className="space-y-4 text-sm text-gray-800"
                data-testid="template-preview-summary"
              >
                <p className="text-gray-700 leading-relaxed" data-testid="template-preview-summary-line">
                  {template?.description?.trim() ||
                    `Structured project with ${data.phaseCount} phase${data.phaseCount === 1 ? '' : 's'} and ${data.taskCount} starter task${data.taskCount === 1 ? '' : 's'}.`}
                </p>

                <div data-testid="template-preview-best-for">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Best for
                  </h3>
                  <p className="text-gray-700">{bestForLine(template, methodology)}</p>
                </div>

                <p
                  className="text-xs text-gray-600 border-t border-slate-100 pt-3"
                  data-testid="template-preview-governance-note"
                >
                  {PHASE5_1_COPY.STRUCTURE_LOCKS}
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Close
            </button>
            {canInstantiate ? (
              <button
                type="button"
                onClick={onUseTemplate}
                disabled={
                  loading ||
                  !data ||
                  (template?.kind !== 'document' && template?.comingSoon === true)
                }
                title={
                  template?.kind !== 'document' && template?.comingSoon
                    ? 'Coming soon'
                    : undefined
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="template-preview-use"
              >
                {template?.kind !== 'document' && template?.comingSoon
                  ? 'Coming soon'
                  : template?.kind === 'document'
                    ? 'Attach to project'
                    : 'Use template'}
              </button>
            ) : !isReadOnly ? (
              <p
                className="max-w-xs text-right text-xs text-slate-500"
                data-testid="template-preview-use-unavailable"
              >
                Only a workspace owner or delivery owner can create a project from a template.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
