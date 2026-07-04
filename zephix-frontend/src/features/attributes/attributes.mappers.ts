import type {
  AttributeDataType,
  AttributeDefinition,
  AttributeScope,
  CreateAttributeDefinitionInput,
  UpdateAttributeDefinitionInput,
} from './attributes.types';
import type { TaskAttributeValuesMap } from './attributes.types';

type RawRecord = Record<string, unknown>;

function readString(raw: RawRecord, camel: string, snake: string): string | null {
  const v = raw[camel] ?? raw[snake];
  if (v === null || v === undefined) return null;
  return String(v);
}

function readBoolean(raw: RawRecord, camel: string, snake: string, fallback = false): boolean {
  const v = raw[camel] ?? raw[snake];
  return typeof v === 'boolean' ? v : fallback;
}

function readOptions(raw: RawRecord): string[] | null {
  const v = raw.options;
  if (v == null) return null;
  if (Array.isArray(v)) return v.map(String);
  return null;
}

/** Normalizes live API (camelCase entity) and frozen-contract snake_case DTO shapes. */
export function mapAttributeDefinitionFromApi(raw: unknown): AttributeDefinition {
  const dto = raw as RawRecord;
  return {
    id: String(dto.id),
    organizationId: readString(dto, 'organizationId', 'organization_id'),
    scope: (dto.scope ?? 'WORKSPACE') as AttributeScope,
    workspaceId: readString(dto, 'workspaceId', 'workspace_id'),
    key: String(dto.key ?? ''),
    label: String(dto.label ?? ''),
    dataType: (dto.dataType ?? dto.data_type ?? 'text') as AttributeDataType,
    locked: readBoolean(dto, 'locked', 'locked'),
    required: readBoolean(dto, 'required', 'required'),
    isActive: readBoolean(dto, 'isActive', 'is_active', true),
    defaultValue: dto.defaultValue ?? dto.default_value ?? null,
    options: readOptions(dto),
  };
}

export function mapCreateAttributeDefinitionToApi(
  input: CreateAttributeDefinitionInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    key: input.key,
    label: input.label,
    dataType: input.dataType,
    required: input.required,
  };
  if (input.options != null) body.options = input.options;
  if (input.locked != null) body.locked = input.locked;
  return body;
}

export function mapUpdateAttributeDefinitionToApi(
  input: UpdateAttributeDefinitionInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.label != null) body.label = input.label;
  if (input.required != null) body.required = input.required;
  if (input.options !== undefined) body.options = input.options;
  if (input.isActive != null) body.isActive = input.isActive;
  if (input.defaultValue !== undefined) body.defaultValue = input.defaultValue;
  return body;
}

function extractValueFromRow(row: RawRecord): unknown {
  if ('value' in row && row.value !== undefined) return row.value;

  const text = row.valueText ?? row.value_text;
  if (text != null) return text;

  const num = row.valueNumber ?? row.value_number;
  if (num != null) return typeof num === 'string' ? Number(num) : num;

  const bool = row.valueBoolean ?? row.value_boolean;
  if (bool != null) return bool;

  const date = row.valueDate ?? row.value_date;
  if (date != null) return date;

  const dt = row.valueDatetime ?? row.value_datetime;
  if (dt != null) return dt;

  const json = row.valueJson ?? row.value_json;
  if (json != null) return json;

  return null;
}

export function mapBatchAttributeValuesFromApi(body: unknown): TaskAttributeValuesMap {
  const result: TaskAttributeValuesMap = {};
  const rows = Array.isArray(body)
    ? body
    : body && typeof body === 'object' && Array.isArray((body as RawRecord).data)
      ? ((body as RawRecord).data as unknown[])
      : [];

  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as RawRecord;
    const taskId = String(row.workTaskId ?? row.work_task_id ?? '');
    const defId = String(row.attributeDefinitionId ?? row.attribute_definition_id ?? '');
    if (!taskId || !defId) continue;
    if (!result[taskId]) result[taskId] = {};
    result[taskId][defId] = extractValueFromRow(row);
  }
  return result;
}
