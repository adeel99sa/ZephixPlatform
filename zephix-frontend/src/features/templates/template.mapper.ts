import type { TemplateDto, TemplateScope } from './templates.api';

export type TemplateKind = 'project' | 'board' | 'mixed' | 'document' | 'form';
export type TemplateMethodology = 'waterfall' | 'scrum' | 'agile' | 'kanban' | 'hybrid';
export type TemplateSetupLevel = 'Simple' | 'Standard' | 'Rich';
export type TemplateKindFilter = 'projects' | 'documents' | 'forms';

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
  };
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
