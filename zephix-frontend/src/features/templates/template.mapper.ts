import type { TemplateDto, TemplateScope } from './templates.api';
import type { CatalogTierCategory } from './categories';
import type { ProjectCapabilities } from '@/features/projects/capabilities';
import { DEFAULT_PROJECT_CAPABILITIES } from '@/features/projects/capabilities';

export type TemplateKind = 'project' | 'board' | 'mixed' | 'document' | 'form';
export type TemplateMethodology = 'waterfall' | 'scrum' | 'agile' | 'kanban' | 'hybrid';
/** Setup badge: prefer metadata.setup (Simple|Standard|Advanced); count fallback may yield Rich. */
export type TemplateSetupLevel = 'Simple' | 'Standard' | 'Rich' | 'Advanced';
export type TemplateKindFilter = 'projects' | 'documents' | 'forms';

/** Active SYSTEM methodology-tier codes (TC-C2 / ACTIVE_TEMPLATE_CODES). */
const METHODOLOGY_TIER_CODES = new Set([
  'pm_waterfall_v2',
  'pm_hybrid_v1',
  'sw_scrum_delivery_v1',
  'sw_kanban_delivery_v1',
  'sw_release_planning_v1',
]);

/** Active SYSTEM domain-tier codes (TC-C3 / ACTIVE_TEMPLATE_CODES). */
const DOMAIN_TIER_CODES = new Set([
  'bug_tracker_v1',
  'roadmap_execution_v1',
  'product_discovery_v1',
  'product_launch_v1',
  'startup_mvp_build_v1',
  'startup_gtm_v1',
]);

type RawTemplate = Record<string, unknown>;

function readString(raw: RawTemplate, camel: string, snake: string): string | undefined {
  const v = raw[camel] ?? raw[snake];
  return typeof v === 'string' ? v : undefined;
}

function readBool(raw: RawTemplate, camel: string, snake: string, fallback = false): boolean {
  const v = raw[camel] ?? raw[snake];
  return typeof v === 'boolean' ? v : fallback;
}

function readNumber(raw: RawTemplate, camel: string, snake: string, fallback = 0): number {
  const v = raw[camel] ?? raw[snake];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function readColumnConfig(raw: RawTemplate): TemplateDto['columnConfig'] {
  const cc = (raw.columnConfig ?? raw.column_config) as Record<string, unknown> | null | undefined;
  if (!cc || typeof cc !== 'object') return undefined;
  const out: NonNullable<TemplateDto['columnConfig']> = {};
  if (Array.isArray(cc.visibleTabs)) {
    out.visibleTabs = cc.visibleTabs.filter((t): t is string => typeof t === 'string');
  }
  const dv = cc.defaultView ?? cc.default_view;
  if (typeof dv === 'string' && dv.trim()) {
    out.defaultView = dv.trim();
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function readDefaultTabs(raw: RawTemplate): string[] | undefined {
  const tabs = raw.defaultTabs ?? raw.default_tabs;
  if (!Array.isArray(tabs)) return undefined;
  const filtered = tabs.filter((t): t is string => typeof t === 'string');
  return filtered.length > 0 ? filtered : undefined;
}

function readStatusGroups(raw: RawTemplate): TemplateDto['statusGroups'] {
  const groups = raw.statusGroups ?? raw.status_groups;
  if (!Array.isArray(groups) || groups.length === 0) return undefined;
  return groups as TemplateDto['statusGroups'];
}

/** Normalize list/detail API rows into canonical TemplateDto. */
export function mapTemplateDto(raw: unknown): TemplateDto {
  const row = (raw && typeof raw === 'object' ? raw : {}) as RawTemplate;
  const kindRaw = readString(row, 'kind', 'kind') ?? 'project';
  const kind = (
    ['project', 'board', 'mixed', 'document', 'form'].includes(kindRaw)
      ? kindRaw
      : 'project'
  ) as TemplateKind;

  const methodologyRaw = readString(row, 'methodology', 'methodology');
  const methodology = methodologyRaw as TemplateMethodology | undefined;

  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    description: readString(row, 'description', 'description'),
    category: readString(row, 'category', 'category'),
    kind,
    icon: readString(row, 'icon', 'icon'),
    templateScope: (readString(row, 'templateScope', 'template_scope') ?? 'ORG') as TemplateScope,
    workspaceId: readString(row, 'workspaceId', 'workspace_id'),
    isDefault: readBool(row, 'isDefault', 'is_default'),
    isSystem: readBool(row, 'isSystem', 'is_system'),
    isActive: readBool(row, 'isActive', 'is_active', true),
    lockState: (readString(row, 'lockState', 'lock_state') ?? 'UNLOCKED') as TemplateDto['lockState'],
    version: readNumber(row, 'version', 'version', 1),
    publishedAt: readString(row, 'publishedAt', 'published_at'),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
    methodology,
    structure: row.structure as TemplateDto['structure'],
    phases: (row.phases as TemplateDto['phases']) ?? undefined,
    task_templates: (row.task_templates as TemplateDto['task_templates']) ?? undefined,
    taskTemplates: (row.taskTemplates as TemplateDto['taskTemplates']) ?? undefined,
    defaultEnabledKPIs: Array.isArray(row.defaultEnabledKPIs)
      ? (row.defaultEnabledKPIs as string[])
      : Array.isArray(row.default_enabled_kpis)
        ? (row.default_enabled_kpis as string[])
        : [],
    metadata: (row.metadata as TemplateDto['metadata']) ?? undefined,
    createdById: readString(row, 'createdById', 'created_by_id') ?? null,
    updatedById: readString(row, 'updatedById', 'updated_by_id') ?? null,
    createdByDisplayName: readString(row, 'createdByDisplayName', 'created_by_display_name') ?? null,
    comingSoon: readBool(row, 'comingSoon', 'coming_soon'),
    templateCode: readString(row, 'templateCode', 'template_code') ?? null,
    isPreferred: readBool(row, 'isPreferred', 'is_preferred'),
    usageCount: readNumber(row, 'usageCount', 'usage_count'),
    defaultTabs: readDefaultTabs(row),
    columnConfig: readColumnConfig(row),
    statusGroups: readStatusGroups(row),
    capabilities: readCapabilities(row),
  };
}

function readCapabilities(raw: RawTemplate): ProjectCapabilities | undefined {
  const caps = raw.capabilities;
  if (!caps || typeof caps !== 'object') return undefined;
  const c = caps as Record<string, unknown>;
  const out: ProjectCapabilities = {
    use_phases:
      typeof c.use_phases === 'boolean'
        ? c.use_phases
        : DEFAULT_PROJECT_CAPABILITIES.use_phases,
    use_iterations:
      typeof c.use_iterations === 'boolean'
        ? c.use_iterations
        : DEFAULT_PROJECT_CAPABILITIES.use_iterations,
    use_gates:
      typeof c.use_gates === 'boolean'
        ? c.use_gates
        : DEFAULT_PROJECT_CAPABILITIES.use_gates,
    use_wip_limits:
      typeof c.use_wip_limits === 'boolean'
        ? c.use_wip_limits
        : DEFAULT_PROJECT_CAPABILITIES.use_wip_limits,
  };
  return out;
}

export function mapTemplateList(raw: unknown): TemplateDto[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapTemplateDto).filter((t) => t.id);
}

/** Derive setup level from real phase + task counts — never expose "complexity" in UI. */
export function deriveSetupLevel(tpl: TemplateDto): TemplateSetupLevel {
  const phases = Array.isArray(tpl.phases) ? tpl.phases.length : 0;
  const tasks = (tpl.taskTemplates?.length ?? tpl.task_templates?.length ?? 0) as number;
  if (phases <= 2 && tasks <= 6) return 'Simple';
  if (phases <= 4 && tasks <= 14) return 'Standard';
  return 'Rich';
}

/** Prefer metadata.setup (seeded Simple|Standard|Advanced); fall back to count-derived. */
export function resolveSetupBadge(tpl: TemplateDto): TemplateSetupLevel {
  const meta = tpl.metadata as Record<string, unknown> | null | undefined;
  const setup = meta && typeof meta.setup === 'string' ? meta.setup.trim() : '';
  if (setup === 'Simple' || setup === 'Standard' || setup === 'Advanced' || setup === 'Rich') {
    return setup;
  }
  return deriveSetupLevel(tpl);
}

/** Catalog tier for left-rail grouping (TC-F2). */
export function resolveCatalogTier(tpl: TemplateDto): CatalogTierCategory {
  if (tpl.templateScope !== 'SYSTEM') return 'Your templates';
  const code = (tpl.templateCode ?? '').trim();
  if (code.startsWith('starter_')) return 'Starters';
  if (METHODOLOGY_TIER_CODES.has(code)) return 'Methodology';
  if (DOMAIN_TIER_CODES.has(code)) return 'Domain';
  // Unknown SYSTEM codes: keep visible under Domain rather than hiding.
  return 'Domain';
}

/** Document catalog linkage — templates.metadata.docKey (TC-B6). */
export function readTemplateDocKey(tpl: TemplateDto): string | null {
  const meta = tpl.metadata as Record<string, unknown> | null | undefined;
  if (!meta) return null;
  const key = meta.docKey ?? meta.doc_key;
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}

/**
 * Recommended governance policy codes from template metadata when present.
 * Accepts `recommendedPolicyCodes` (string[]) or intersection with `governanceOptions`.
 */
export function readRecommendedPolicyCodes(tpl: TemplateDto): string[] {
  const meta = tpl.metadata as Record<string, unknown> | null | undefined;
  if (!meta) return [];
  const raw = meta.recommendedPolicyCodes ?? meta.recommended_policy_codes;
  if (Array.isArray(raw)) {
    return raw.filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
  }
  return [];
}

export function readRecommendedPolicyBundle(tpl: TemplateDto): string | null {
  const meta = tpl.metadata as Record<string, unknown> | null | undefined;
  if (!meta) return null;
  const b = meta.recommendedPolicyBundle ?? meta.recommended_policy_bundle;
  return typeof b === 'string' && b.trim() ? b.trim() : null;
}

export function readTemplateDefaultView(tpl: TemplateDto): string | undefined {
  const dv = tpl.columnConfig?.defaultView;
  return typeof dv === 'string' && dv.trim() ? dv.trim() : undefined;
}

/** Post-instantiate route honoring columnConfig.defaultView when present. */
export function resolvePostInstantiateProjectPath(
  tpl: TemplateDto,
  projectId: string,
): string {
  const defaultView = readTemplateDefaultView(tpl);
  if (defaultView) {
    return `/projects/${projectId}/${defaultView}`;
  }
  const isWaterfall = (tpl.methodology || '').toLowerCase() === 'waterfall';
  return isWaterfall ? `/projects/${projectId}/tasks` : `/projects/${projectId}`;
}

export function matchesKindFilter(tpl: TemplateDto, filter: TemplateKindFilter): boolean {
  switch (filter) {
    case 'projects':
      return tpl.kind === 'project' || tpl.kind === 'board' || tpl.kind === 'mixed';
    case 'documents':
      return tpl.kind === 'document';
    case 'forms':
      return tpl.kind === 'form';
    default:
      return true;
  }
}

export function isOrgPreferredTemplate(tpl: TemplateDto): boolean {
  return tpl.isPreferred === true && tpl.templateScope === 'ORG';
}
