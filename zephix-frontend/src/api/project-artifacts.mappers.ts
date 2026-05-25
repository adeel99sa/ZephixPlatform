import type {
  ArtifactFieldType,
  ArtifactItemPriority,
  CustomFieldDefinition,
  ProjectArtifact,
  ProjectArtifactItem,
  ProjectArtifactType,
} from './project-artifacts.types';

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function asBool(v: unknown): boolean {
  return v === true;
}

function mapFieldDefinition(raw: unknown): CustomFieldDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = asString(r.id);
  const name = asString(r.name);
  const type = asString(r.type) as ArtifactFieldType | undefined;
  if (!id || !name || !type) return null;
  const enumValues = Array.isArray(r.enumValues ?? r.enum_values)
    ? (r.enumValues ?? r.enum_values as unknown[]).filter((x): x is string => typeof x === 'string')
    : undefined;
  return {
    id,
    name,
    type,
    required: asBool(r.required),
    enumValues,
    defaultValue: r.defaultValue ?? r.default_value,
    displayOrder: asNumber(r.displayOrder ?? r.display_order),
  };
}

export function mapArtifact(raw: unknown): ProjectArtifact | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = asString(r.id);
  const projectId = asString(r.projectId ?? r.project_id);
  const workspaceId = asString(r.workspaceId ?? r.workspace_id);
  const organizationId = asString(r.organizationId ?? r.organization_id);
  const type = asString(r.type) as ProjectArtifactType | undefined;
  const name = asString(r.name);
  const createdBy = asString(r.createdBy ?? r.created_by);
  const createdAt = asString(r.createdAt ?? r.created_at);
  const updatedAt = asString(r.updatedAt ?? r.updated_at);
  if (!id || !projectId || !workspaceId || !organizationId || !type || !name || !createdBy || !createdAt || !updatedAt) {
    return null;
  }
  const defsRaw = r.customFieldDefinitions ?? r.custom_field_definitions;
  const customFieldDefinitions = Array.isArray(defsRaw)
    ? defsRaw.map(mapFieldDefinition).filter((d): d is CustomFieldDefinition => d != null)
    : [];
  const itemCount = asNumber(r.itemCount ?? r.item_count);
  return {
    id,
    organizationId,
    workspaceId,
    projectId,
    type,
    name,
    description: asString(r.description) ?? null,
    icon: asString(r.icon) ?? null,
    position: asNumber(r.position) ?? 0,
    templateId: asString(r.templateId ?? r.template_id) ?? null,
    statusGroupId: asString(r.statusGroupId ?? r.status_group_id) ?? null,
    customFieldDefinitions,
    createdBy,
    createdAt,
    updatedAt,
    ...(itemCount !== undefined ? { itemCount } : {}),
  };
}

export function mapArtifactItem(raw: unknown): ProjectArtifactItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = asString(r.id);
  const artifactId = asString(r.artifactId ?? r.artifact_id);
  const workspaceId = asString(r.workspaceId ?? r.workspace_id);
  const organizationId = asString(r.organizationId ?? r.organization_id);
  const name = asString(r.name);
  const createdBy = asString(r.createdBy ?? r.created_by);
  const createdAt = asString(r.createdAt ?? r.created_at);
  const updatedAt = asString(r.updatedAt ?? r.updated_at);
  if (!id || !artifactId || !workspaceId || !organizationId || !name || !createdBy || !createdAt || !updatedAt) {
    return null;
  }
  const priorityRaw = asString(r.priority);
  const priority = priorityRaw as ArtifactItemPriority | undefined;
  const content =
    r.content && typeof r.content === 'object' && !Array.isArray(r.content)
      ? (r.content as Record<string, unknown>)
      : {};
  const customFieldValues =
    r.customFieldValues ?? r.custom_field_values;
  const cfv =
    customFieldValues && typeof customFieldValues === 'object' && !Array.isArray(customFieldValues)
      ? (customFieldValues as Record<string, unknown>)
      : {};
  const due = r.dueDate ?? r.due_date;
  return {
    id,
    organizationId,
    workspaceId,
    artifactId,
    name,
    content,
    statusId: asString(r.statusId ?? r.status_id) ?? null,
    assigneeId: asString(r.assigneeId ?? r.assignee_id) ?? null,
    priority: priority ?? null,
    dueDate: due != null ? String(due) : null,
    customFieldValues: cfv,
    position: asNumber(r.position) ?? 0,
    parentItemId: asString(r.parentItemId ?? r.parent_item_id) ?? null,
    createdBy,
    createdAt,
    updatedAt,
  };
}

export function mapArtifactList(raw: unknown): ProjectArtifact[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapArtifact).filter((a): a is ProjectArtifact => a != null);
}
