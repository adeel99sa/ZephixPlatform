/**
 * Phase 4 (Template Center): SaveAsTemplateModal
 *
 * Saves an existing project as a WORKSPACE-scoped template.
 *
 * Snapshot scope (Option B, enforced by backend):
 *   - phases, tasks (title/description/priority/estimate/phaseOrder)
 *   - methodology, description
 *   - source metadata (sourceProjectId, sourceProjectName)
 *
 * Backend gates this endpoint to Workspace Owner (admin override allowed).
 * Default name = "<source name> Template" — backend appends " (n)" on collision.
 */
import { useEffect, useState } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';
import { projectsApi } from '../projects.api';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  onSaved?: (templateId: string, templateName: string) => void;
}

export function SaveAsTemplateModal({
  open,
  onClose,
  projectId,
  projectName,
  onSaved,
}: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(`${projectName} Template`);
      setDescription('');
      setSubmitting(false);
    }
  }, [open, projectName]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      const result = await projectsApi.saveProjectAsTemplate(projectId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success(`Saved as template: ${result.name}`);
      // Phase 4.6: notify any open TemplateCenter to refresh its list so the
      // newly saved workspace template shows up without a manual reopen.
      try {
        window.dispatchEvent(new CustomEvent('zephix:templates:invalidate'));
      } catch {
        /* ignore — non-browser env */
      }
      onSaved?.(result.id, result.name);
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to save template';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <BookmarkPlus className="w-5 h-5 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">Save as template</h2>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-slate-500">
            Captures phases, tasks, methodology, and description. Live work data
            (status, assignees, dates, comments) is not included.
          </p>

          <div>
            <label
              htmlFor="sat-name"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Template name
            </label>
            <input
              id="sat-name"
              data-testid="save-as-template-name"
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
              disabled={submitting}
            />
          </div>

          <div>
            <label
              htmlFor="sat-description"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="sat-description"
              data-testid="save-as-template-description"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="save-as-template-submit"
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </div>
    </div>
  );
}
