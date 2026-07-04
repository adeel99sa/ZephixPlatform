/** WAVE 1 Track A — attribute definitions & values (frozen API contract). */

export const ATTRIBUTE_DATA_TYPES = [
  'text',
  'long_text',
  'number',
  'integer',
  'decimal',
  'currency',
  'percentage',
  'date',
  'datetime',
  'duration',
  'boolean',
  'single_select',
  'multi_select',
  'people',
  'relationship',
  'url',
  'email',
  'file_reference',
  'computed',
  'rating',
] as const;

export type AttributeDataType = (typeof ATTRIBUTE_DATA_TYPES)[number];

export type AttributeScope = 'SYSTEM' | 'ORG' | 'WORKSPACE';

export interface AttributeDefinition {
  id: string;
  organizationId: string | null;
  scope: AttributeScope;
  workspaceId: string | null;
  key: string;
  label: string;
  dataType: AttributeDataType;
  locked: boolean;
  required: boolean;
  isActive: boolean;
  defaultValue: unknown | null;
  options: string[] | null;
}

export interface CreateAttributeDefinitionInput {
  key: string;
  label: string;
  dataType: AttributeDataType;
  required: boolean;
  options?: string[];
  scope?: AttributeScope;
  locked?: boolean;
}

export interface UpdateAttributeDefinitionInput {
  label?: string;
  required?: boolean;
  options?: string[] | null;
  isActive?: boolean;
  defaultValue?: unknown | null;
}

export type AttributeValue = unknown;

export const ATTRIBUTE_CREATABLE_DATA_TYPES = ATTRIBUTE_DATA_TYPES.filter(
  (t) => t !== 'computed' && t !== 'relationship',
) as Exclude<AttributeDataType, 'computed' | 'relationship'>[];

export function isSelectDataType(dataType: AttributeDataType): boolean {
  return dataType === 'single_select' || dataType === 'multi_select';
}

export function attributeColumnId(definitionId: string): string {
  return `attr:${definitionId}`;
}

export function parseAttributeColumnId(columnId: string): string | null {
  return columnId.startsWith('attr:') ? columnId.slice(5) : null;
}
