import { PreviewResponse } from '../api';
import type { TemplateDto } from '../templates.api';
import { isTemplateOriginMetadata } from '../template-origin';
import { useWorkspaceStore } from '@/state/workspace.store';
import { PHASE5_1_COPY } from '@/constants/phase5_1.copy';

function previewComplexityLabel(
  phaseCount: number,
  taskCount: number,
): 'Light' | 'Standard' | 'Advanced' {
  if (phaseCount <= 2 && taskCount <= 6) return 'Light';
  if (phaseCount <= 4 && taskCount <= 20) return 'Standard';
  return 'Advanced';
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
  const { isReadOnly } = useWorkspaceStore();

  if (!open) return null;

  const methodology = template?.methodology;
  const complexity =
    data != null
      ? previewComplexityLabel(data.phaseCount, data.taskCount)
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
                  {complexity && (
                    <span
                      className="rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-800"
                      data-testid="template-preview-complexity-badge"
                    >
                      {complexity}
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
                {!template?.description?.trim() && (
                  <p className="text-gray-700 leading-relaxed">
                    {`Structured project with ${data.phaseCount} phase${data.phaseCount === 1 ? '' : 's'} and ${data.taskCount} starter task${data.taskCount === 1 ? '' : 's'}.`}
                  </p>
                )}

                <div data-testid="template-preview-best-for">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Best for
                  </h3>
                  <p className="text-gray-700">{bestForLine(template, methodology)}</p>
                </div>

                <div data-testid="template-preview-phases-section">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    Included phases ({data.phases.length})
                  </h3>
                  <ul className="space-y-1 border border-slate-100 rounded-md divide-y divide-slate-100">
                    {data.phases.map((phase, idx) => (
                      <li
                        key={`${phase.name}-${idx}`}
                        className="px-3 py-2 flex justify-between gap-2"
                      >
                        <span className="font-medium text-gray-900">{phase.name}</span>
                        <span className="text-gray-500 shrink-0">
                          {phase.taskCount} task{phase.taskCount === 1 ? '' : 's'}
                          {phase.isMilestone ? ' · Milestone' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {(data.allowedBeforeStart.length > 0 ||
                  data.allowedAfterStart.length > 0) && (
                  <div data-testid="template-preview-required-section" className="space-y-3">
                    {data.allowedBeforeStart.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                          Required artifacts (before start)
                        </h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                          {data.allowedBeforeStart.map((item, idx) => (
                            <li key={`b-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {data.allowedAfterStart.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                          Required approvals &amp; gates (after start)
                        </h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                          {data.allowedAfterStart.map((item, idx) => (
                            <li key={`a-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {data.defaultTaskStatuses.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Default task statuses
                    </h3>
                    <p className="text-gray-700">
                      {data.defaultTaskStatuses.join(', ')}
                    </p>
                  </div>
                )}

                {/* Phase 5B.1 — Waterfall summary-first sections.
                    Pulled from template.metadata seeded by SYSTEM_TEMPLATE_DEFS.
                    Only renders when present, so non-Waterfall templates are
                    unaffected. NOT a fake render — values originate in the
                    backend template definition. */}
                {(() => {
                  const meta = (template?.metadata ?? {}) as Record<string, unknown>;
                  const defaultColumns = Array.isArray(meta.defaultColumns)
                    ? (meta.defaultColumns as string[])
                    : [];
                  const requiredArtifacts = Array.isArray(meta.requiredArtifacts)
                    ? (meta.requiredArtifacts as string[])
                    : [];
                  const governanceOptions = Array.isArray(meta.governanceOptions)
                    ? (meta.governanceOptions as string[])
                    : [];
                  const includedViews = Array.isArray(meta.includedViews)
                    ? (meta.includedViews as string[])
                    : [];
                  const showWaterfallBlocks =
                    defaultColumns.length > 0 ||
                    requiredArtifacts.length > 0 ||
                    governanceOptions.length > 0 ||
                    includedViews.length > 0;
                  if (!showWaterfallBlocks) return null;
                  return (
                    <>
                      {defaultColumns.length > 0 && (
                        <div data-testid="template-preview-default-columns">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                            Default columns
                          </h3>
                          <p className="text-gray-700">
                            {defaultColumns.join(', ')}
                          </p>
                        </div>
                      )}
                      {requiredArtifacts.length > 0 && (
                        <div data-testid="template-preview-required-artifacts">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                            Required artifacts
                          </h3>
                          <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                            {requiredArtifacts.map((a, i) => (
                              <li key={`art-${i}`}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {governanceOptions.length > 0 && (
                        <div data-testid="template-preview-governance-options">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                            Governance options
                          </h3>
                          <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                            {governanceOptions.map((g, i) => (
                              <li key={`gov-${i}`}>{g}</li>
                            ))}
                          </ul>
                          <p className="mt-2 text-xs text-gray-500">
                            Org Admin can enable governance rules for this template later. None are active by default.
                          </p>
                        </div>
                      )}
                      {includedViews.length > 0 && (
                        <div data-testid="template-preview-included-views">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                            Included views
                          </h3>
                          <p className="text-gray-700">{includedViews.join(', ')}</p>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div data-testid="template-preview-tabs-section">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    Project tabs after creation
                  </h3>
                  <p className="text-gray-700">
                    Overview, Activities, Board, Gantt — same shell as every Zephix project.
                  </p>
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
            {!isReadOnly && (
              <button
                type="button"
                onClick={onUseTemplate}
                disabled={loading || !data || template?.comingSoon === true}
                title={template?.comingSoon ? 'Coming soon' : undefined}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {template?.comingSoon ? 'Coming soon' : 'Use template'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
