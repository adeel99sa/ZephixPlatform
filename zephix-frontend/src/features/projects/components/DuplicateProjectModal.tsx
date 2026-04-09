import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import { projectsApi } from '../projects.api';
import { useWorkspaceStore } from '@/state/workspace.store';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  workspaceId: string;
}

export function DuplicateProjectModal({
  open,
  onClose,
  projectId,
  projectName,
  workspaceId,
}: Props) {
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceStore();

  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setNewName(`${projectName} (Copy)`);
      setSubmitting(false);
    }
  }, [open, projectName]);

  if (!open) return null;

  /**
   * Phase 4.5: routes through the canonical save-as-template → instantiate
   * plumbing on the backend. Structure only — live execution data is excluded
   * by Option B snapshot rules.
   */
  const handleDuplicate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      setSubmitting(true);
      const result = await projectsApi.duplicateProject(projectId, {
        newName: trimmed,
      });
      toast.success(`Duplicated as "${result.newProjectName}"`);
      onClose();
      const slug = activeWorkspaceId || workspaceId;
      navigate(`/w/${slug}/projects/${result.newProjectId}`);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to duplicate project',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <Copy className="w-5 h-5 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">Duplicate project</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Name input */}
          <div>
            <label
              htmlFor="clone-name"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Project name
            </label>
            <input
              id="clone-name"
              data-testid="clone-name-input"
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={255}
              autoFocus
            />
          </div>

          {/* Phase 4.5: structure-only is the only mode — backed by Option B snapshot */}
          <p className="text-xs text-slate-500">
            Copies phases, tasks, methodology, and description. Live work data
            (status, assignees, dates, comments) is not carried over.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="clone-submit"
            onClick={handleDuplicate}
            disabled={submitting || !newName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Duplicating...' : 'Duplicate'}
          </button>
        </div>
      </div>
    </div>
  );
}
