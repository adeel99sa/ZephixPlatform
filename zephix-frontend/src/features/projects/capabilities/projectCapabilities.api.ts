import { request } from '@/lib/api';

import {
  DEFAULT_PROJECT_CAPABILITIES,
  type ProjectCapabilities,
} from './projectCapabilities.types';

function readBool(raw: Record<string, unknown>, key: keyof ProjectCapabilities): boolean | undefined {
  const v = raw[key];
  return typeof v === 'boolean' ? v : undefined;
}

/** Normalizes API payload (snake_case tolerant) to resolved capability flags. */
export function mapProjectCapabilitiesFromApi(raw: unknown): ProjectCapabilities {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PROJECT_CAPABILITIES };
  }
  const r = raw as Record<string, unknown>;
  const body = ('data' in r && r.data && typeof r.data === 'object' ? r.data : r) as Record<
    string,
    unknown
  >;
  return {
    use_phases: readBool(body, 'use_phases') ?? DEFAULT_PROJECT_CAPABILITIES.use_phases,
    use_iterations:
      readBool(body, 'use_iterations') ?? DEFAULT_PROJECT_CAPABILITIES.use_iterations,
    use_gates: readBool(body, 'use_gates') ?? DEFAULT_PROJECT_CAPABILITIES.use_gates,
    use_wip_limits:
      readBool(body, 'use_wip_limits') ?? DEFAULT_PROJECT_CAPABILITIES.use_wip_limits,
  };
}

export async function getProjectCapabilities(
  workspaceId: string,
  projectId: string,
): Promise<ProjectCapabilities> {
  const body = await request.get<unknown>(
    `/workspaces/${workspaceId}/projects/${projectId}/capabilities`,
    { headers: { 'x-workspace-id': workspaceId } },
  );
  return mapProjectCapabilitiesFromApi(body);
}
