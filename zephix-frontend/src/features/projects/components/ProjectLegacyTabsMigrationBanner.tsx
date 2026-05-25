import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';

import { useProjectContext } from '../layout/ProjectPageLayout';

function rawVisibleTabs(columnConfig?: Record<string, boolean | string[]> | null): string[] {
  const raw = columnConfig?.visibleTabs;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string');
}

/** Shown when a project still has Documents or Risks in saved tab config (Sprint 5.2a migration). */
export function ProjectLegacyTabsMigrationBanner() {
  const { project } = useProjectContext();

  const show = useMemo(() => {
    if (!project) return false;
    const tabs = rawVisibleTabs(project.columnConfig);
    return tabs.includes('documents') || tabs.includes('risks');
  }, [project?.columnConfig]);

  if (!show || !project) return null;

  return (
    <div
      className="mb-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
      data-testid="project-legacy-tabs-migration-banner"
    >
      <Info className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      <div>
        <p className="font-medium">Documents and Risks moved to project artifacts</p>
        <p className="mt-1 text-amber-900/90">
          Use the sidebar under each project to open registers and logs (for example Risk register or RAID
          log). Legacy Documents and Risks tabs are no longer available in the tab bar.
        </p>
        <p className="mt-2">
          <Link
            to={`/projects/${project.id}`}
            className="font-medium text-amber-950 underline hover:text-amber-800"
          >
            Stay on Overview
          </Link>
        </p>
      </div>
    </div>
  );
}
