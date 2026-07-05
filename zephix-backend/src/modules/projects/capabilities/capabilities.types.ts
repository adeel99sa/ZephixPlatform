export interface ProjectCapabilities {
  use_phases: boolean;
  use_iterations: boolean;
  use_gates: boolean;
  use_wip_limits: boolean;
}

export const VALID_CAPABILITY_KEYS: ReadonlySet<string> = new Set([
  'use_phases',
  'use_iterations',
  'use_gates',
  'use_wip_limits',
]);

// Merges stored JSONB with absent-key defaults.
// Defaults: phases=true (waterfall-shaped), iterations=false, gates=true, wip_limits=false.
// Unknown keys in raw are ignored; only the 4 canonical keys are returned.
export function resolveCapabilities(
  raw: Record<string, unknown> | null | undefined,
): ProjectCapabilities {
  const r = raw ?? {};
  return {
    use_phases: typeof r.use_phases === 'boolean' ? r.use_phases : true,
    use_iterations: typeof r.use_iterations === 'boolean' ? r.use_iterations : false,
    use_gates: typeof r.use_gates === 'boolean' ? r.use_gates : true,
    use_wip_limits: typeof r.use_wip_limits === 'boolean' ? r.use_wip_limits : false,
  };
}
