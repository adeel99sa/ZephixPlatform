import { useCallback, useMemo, useState } from 'react';
import { Info, X } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/state/AuthContext';
import { projectsApi } from '@/features/projects/projects.api';
import {
  columnConfigHasLegacyTabs,
  stripLegacyVisibleTabs,
} from '@/features/projects/layout/stripLegacyVisibleTabs';

import { useProjectContext } from '../layout/ProjectPageLayout';

function migrationBannerDismissKey(userId: string): string {
  return `migration-banner-${userId}`;
}

/** Shown when a project still has Risks or project_artifacts in saved tab config. */
export function ProjectLegacyTabsMigrationBanner() {
  const { user } = useAuth();
  const { project, refresh } = useProjectContext();
  const [dismissed, setDismissed] = useState(false);
  const [stripping, setStripping] = useState(false);

  const userId = user?.id ?? 'guest';

  const show = useMemo(() => {
    if (dismissed || !project) return false;
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem(migrationBannerDismissKey(userId)) === 'dismissed') {
        return false;
      }
    }
    return columnConfigHasLegacyTabs(project.columnConfig);
  }, [dismissed, project, userId]);

  const persistStrippedConfig = useCallback(async () => {
    if (!project) return;
    const next = stripLegacyVisibleTabs(project.columnConfig);
    setStripping(true);
    try {
      await projectsApi.updateColumnConfig(project.id, next);
      await refresh();
    } catch {
      toast.error('Could not update project tabs. Try again from project settings.');
    } finally {
      setStripping(false);
    }
  }, [project, refresh]);

  const handleDismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(migrationBannerDismissKey(userId), 'dismissed');
    }
    setDismissed(true);
    void persistStrippedConfig();
  }, [userId, persistStrippedConfig]);

  if (!show || !project) return null;

  return (
    <div
      className="mb-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
      data-testid="project-legacy-tabs-migration-banner"
    >
      <Info className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          Risks and legacy artifact tabs have moved to the sidebar. Documents stays as a project tab.
        </p>
        <p className="mt-1 text-amber-900/90">
          Open a project in the sidebar and expand it to use registers and logs (for example Risk
          Register or RAID Log).
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        disabled={stripping}
        className="shrink-0 rounded p-1 text-amber-800 hover:bg-amber-100/80"
        aria-label="Dismiss migration notice"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
