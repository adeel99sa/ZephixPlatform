import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import { useCloneProject } from '../api/useCloneProject';
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
  const cloneMutation = useCloneProject();

  const [newName, setNewName] = useState('');
  const [mode, setMode] = useState<'structure_only' | 'full_clone'>('structure_only');

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setNewName(`${projectName} (Copy)`);
      setMode('structure_only');
    }
  }, [open, projectName]);

  if (!open) return null;

  const handleDuplicate = async () => {
    try {
      const result = await cloneMutation.mutateAsync({
        workspaceId,
        projectId,
        mode,
        newName: newName.trim() || undefined,
      });

      toast.success('Duplicated');
      onClose();

      // Navigate to the new project
      const slug = activeWorkspaceId || workspaceId;
      navigate(`/w/${slug}/projects/${result.newProjectId}`);
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'CLONE_IN_PROGRESS') {
        toast.error('A duplication is already in progress');
      } else if (code === 'POLICY_DISABLED') {
        toast.error('Project duplication is not enabled');
      } else if (code === 'MODE_NOT_AVAILABLE') {
        toast.error('This duplication mode is not yet available');
      } else {
        toast.error(err?.response?.data?.message || 'Failed to duplicate project');
      }
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

          {/* Mode selection */}
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">
              What to duplicate
            </span>
            <div className="space-y-2">
              {/* Structure only */}
              <label
                data-testid="mode-structure-only"
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  mode === 'structure_only'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="clone-mode"
                  value="structure_only"
                  checked={mode === 'structure_only'}
                  onChange={() => setMode('structure_only')}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-slate-900">Structure only</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Phases, gates, KPIs, workflow config, and views. No tasks or work data.
                  </div>
                </div>
              </label>

              {/* Full clone — disabled in Phase 1 */}
              <label
                data-testid="mode-full-clone"
                className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-not-allowed opacity-60"
              >
                <input
                  type="radio"
                  name="clone-mode"
                  value="full_clone"
                  disabled
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-slate-400">Clone with work</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Coming next
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            disabled={cloneMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="clone-submit"
            onClick={handleDuplicate}
            disabled={cloneMutation.isPending || !newName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cloneMutation.isPending ? 'Duplicating...' : 'Duplicate'}
          </button>
        </div>
      </div>
    </div>
  );
}
