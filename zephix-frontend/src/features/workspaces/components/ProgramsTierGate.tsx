import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getWorkspaceComplexityMode } from '@/features/workspaces/workspace.api';
import type { WorkspaceComplexityMode } from '@/features/workspaces/types';
import { isB2TenancyV2Enabled } from '@/lib/flags';

const DEFAULT_BANNER =
  'Programs are available in Governed tier only. Existing programs are read-only.';

export type ProgramsTierGateProps = {
  workspaceId: string;
  children: ReactNode;
  fallback?: ReactNode;
};

function isGovernedMode(mode: WorkspaceComplexityMode | undefined): boolean {
  return mode === 'governed';
}

/**
 * When {@link isB2TenancyV2Enabled} is false, renders `children` only (no network).
 * When true, fetches workspace complexity and hides governed-only UI unless mode is `governed`.
 */
export function ProgramsTierGate({ workspaceId, children, fallback }: ProgramsTierGateProps) {
  const b2 = isB2TenancyV2Enabled();

  const query = useQuery({
    queryKey: ['workspace-complexity-mode', workspaceId],
    queryFn: async () => {
      const res = await getWorkspaceComplexityMode(workspaceId);
      return res.mode;
    },
    enabled: b2 && Boolean(workspaceId),
    staleTime: 60_000,
  });

  if (!b2) {
    return <>{children}</>;
  }

  if (!workspaceId) {
    return <>{children}</>;
  }

  if (query.isLoading) {
    return (
      <div
        role="status"
        className="text-sm text-slate-500"
        data-testid="programs-tier-gate-loading"
      >
        Loading programs availability…
      </div>
    );
  }

  if (query.isError || query.data === undefined) {
    return (
      <div
        role="region"
        aria-label="Programs tier notice"
        className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        data-testid="programs-tier-gate-banner"
      >
        {fallback ?? DEFAULT_BANNER}
      </div>
    );
  }

  if (isGovernedMode(query.data)) {
    return <>{children}</>;
  }

  return (
    <div
      role="region"
      aria-label="Programs tier notice"
      className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      data-testid="programs-tier-gate-banner"
    >
      {fallback ?? DEFAULT_BANNER}
    </div>
  );
}
