import type {
  AttributeDataType,
  AttributeDefinition,
  AttributeScope,
  CreateAttributeDefinitionInput,
  UpdateAttributeDefinitionInput,
} from './attributes.types';

export interface AttributeDefinitionDto {
  id: string;
  organization_id: string | null;
  scope: AttributeScope;
  workspace_id: string | null;
  key: string;
  label: string;
  data_type: AttributeDataType;
  locked: boolean;
  required: boolean;
  is_active: boolean;
  default_value: unknown | null;
  options: string[] | null;
}

export function mapAttributeDefinitionFromApi(dto: AttributeDefinitionDto): AttributeDefinition {
  return {
    id: dto.id,
    organizationId: dto.organization_id,
    scope: dto.scope,
    workspaceId: dto.workspace_id,
    key: dto.key,
    label: dto.label,
    dataType: dto.data_type,
    locked: dto.locked,
    required: dto.required,
    isActive: dto.is_active,
    defaultValue: dto.default_value,
    options: dto.options,
  };
}

export function mapCreateAttributeDefinitionToApi(
  input: CreateAttributeDefinitionInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    key: input.key,
    label: input.label,
    data_type: input.dataType,
    required: input.required,
    scope: input.scope ?? 'WORKSPACE',
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
  if (input.isActive != null) body.is_active = input.isActive;
  if (input.defaultValue !== undefined) body.default_value = input.defaultValue;
  return body;
}
