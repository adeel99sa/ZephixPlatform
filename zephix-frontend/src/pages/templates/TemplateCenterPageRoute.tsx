/**
 * TC-F1 — Thin full-page wrapper for /templates using canonical TemplateCenterModal browse.
 */
import { useNavigate } from 'react-router-dom';

import { TemplateCenterModal } from '@/features/templates/components/TemplateCenterModal';
import { useWorkspaceStore } from '@/state/workspace.store';

export default function TemplateCenterPageRoute() {
  const navigate = useNavigate();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  if (!activeWorkspaceId) {
    return (
      <div className="flex h-64 items-center justify-center p-6 text-sm text-slate-600">
        Select a workspace to browse templates.
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-6" data-testid="template-center-page">
      <TemplateCenterModal
        open
        embedded
        workspaceId={activeWorkspaceId}
        onClose={() => navigate('/workspaces')}
      />
    </div>
  );
}
