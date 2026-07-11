/**
 * TC-F2 — attach a document template to an existing project (project picker).
 * Calls POST /projects/:id/documents/from-template with metadata.docKey.
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import type { TemplateDto } from '@/features/templates/templates.api';
import { attachDocumentFromTemplate } from '@/features/templates/templates.api';
import { readTemplateDocKey } from '@/features/templates/template.mapper';
import { listProjects } from '@/features/projects/api';
import type { Project } from '@/features/projects/types';

interface AttachDocumentModalProps {
  open: boolean;
  template: TemplateDto | null;
  workspaceId: string;
  onClose: () => void;
}

export function AttachDocumentModal({
  open,
  template,
  workspaceId,
  onClose,
}: AttachDocumentModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const docKey = template ? readTemplateDocKey(template) : null;

  useEffect(() => {
    if (!open || !workspaceId) return;
    let cancelled = false;
    setLoading(true);
    setProjectId('');
    listProjects(workspaceId)
      .then((rows) => {
        if (!cancelled) setProjects(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) {
          setProjects([]);
          toast.error('Could not load projects');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, workspaceId]);

  if (!open || !template) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docKey) {
      toast.error('This document template has no docKey');
      return;
    }
    if (!projectId) {
      toast.error('Select a project');
      return;
    }
    setSubmitting(true);
    try {
      await attachDocumentFromTemplate(projectId, docKey);
      toast.success(`Attached “${template.name}” to project`);
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message || e?.message || 'Failed to attach document');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[5100] overflow-y-auto" data-testid="attach-document-modal">
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} aria-hidden />
        <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Attach to project</h3>
            <p className="mt-1 text-sm text-slate-600 truncate">{template.name}</p>
          </div>
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {!docKey ? (
              <p className="text-sm text-red-700">This template is missing a document key.</p>
            ) : null}
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="attach-project">
                  Project
                </label>
                <select
                  id="attach-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  data-testid="attach-document-project-select"
                  required
                >
                  <option value="">Select a project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !docKey || !projectId}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                data-testid="attach-document-submit"
              >
                {submitting ? 'Attaching…' : 'Attach'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
