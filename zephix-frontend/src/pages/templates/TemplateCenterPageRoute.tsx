/**
 * TC-F1 / TC-F3 — Thin full-page wrapper for /templates using canonical TemplateCenterModal browse.
 * Supports ?tier=Your%20templates to land on a catalog tier after Save-as-Template.
 */
import { useNavigate, useSearchParams } from 'react-router-dom';

import { TemplateCenterModal } from '@/features/templates/components/TemplateCenterModal';
import { CATALOG_TIER_CATEGORIES } from '@/features/templates/categories';
import { useWorkspaceStore } from '@/state/workspace.store';

export default function TemplateCenterPageRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const tierParam = searchParams.get('tier');
  const initialCategory =
    tierParam &&
    (CATALOG_TIER_CATEGORIES as readonly string[]).includes(tierParam)
      ? tierParam
      : null;

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
        initialCategory={initialCategory}
        onClose={() => navigate('/workspaces')}
      />
    </div>
  );
}
