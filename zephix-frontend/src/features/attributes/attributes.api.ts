/**
 * Attribute engine API — frozen WAVE 1 contract.
 * Mock layer active until backend Step 4 deploys (VITE_ATTRIBUTES_MOCK !== 'false').
 */

import { request } from '@/lib/api';
import { useWorkspaceStore } from '@/state/workspace.store';

import {
  mapAttributeDefinitionFromApi,
  mapCreateAttributeDefinitionToApi,
  mapUpdateAttributeDefinitionToApi,
  type AttributeDefinitionDto,
} from './attributes.mappers';
import { MOCK_ATTRIBUTE_DEFINITIONS, MOCK_ATTRIBUTE_VALUES } from './attributes.fixtures';
import { isAttributeTypeMismatch } from './mapAttributeApiError';
import type {
  AttributeDefinition,
  CreateAttributeDefinitionInput,
  UpdateAttributeDefinitionInput,
} from './attributes.types';

/** Default mock until backend Step 4; set VITE_ATTRIBUTES_MOCK=false to wire live API. */
const USE_MOCKS = import.meta.env.VITE_ATTRIBUTES_MOCK !== 'false';

let mockDefinitions: AttributeDefinition[] = [...MOCK_ATTRIBUTE_DEFINITIONS];
const mockValues: Record<string, Record<string, unknown>> = structuredClone(MOCK_ATTRIBUTE_VALUES);

function requireWorkspaceId(explicit?: string): string {
  const wsId = explicit ?? useWorkspaceStore.getState().activeWorkspaceId;
  if (!wsId) {
    const err = new Error('Select a workspace before managing attributes.');
    (err as Error & { code?: string }).code = 'WORKSPACE_REQUIRED';
    throw err;
  }
  return wsId;
}

function cloneDefinitions(): AttributeDefinition[] {
  return mockDefinitions.map((d) => ({ ...d, options: d.options ? [...d.options] : null }));
}

function validateValueType(dataType: AttributeDefinition['dataType'], value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  switch (dataType) {
    case 'text':
    case 'long_text':
    case 'url':
    case 'email':
      return typeof value === 'string';
    case 'number':
    case 'integer':
    case 'decimal':
    case 'currency':
    case 'percentage':
    case 'rating':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'date':
    case 'datetime':
      return typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean';
    case 'single_select':
      return typeof value === 'string';
    case 'multi_select':
      return Array.isArray(value) && value.every((v) => typeof v === 'string');
    default:
      return true;
  }
}

function unwrapList<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
    return (body as { data: T[] }).data;
  }
  return [];
}

function unwrapOne<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in (body as object)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export async function listAttributeDefinitions(workspaceId?: string): Promise<AttributeDefinition[]> {
  const wsId = requireWorkspaceId(workspaceId);
  if (USE_MOCKS) {
    return cloneDefinitions().filter((d) => d.isActive);
  }
  const body = await request.get<unknown>(`/workspaces/${wsId}/attributes`);
  return unwrapList<AttributeDefinitionDto>(body).map(mapAttributeDefinitionFromApi);
}

export async function listAvailableAttributes(workspaceId?: string): Promise<AttributeDefinition[]> {
  const wsId = requireWorkspaceId(workspaceId);
  if (USE_MOCKS) {
    return cloneDefinitions().filter((d) => d.isActive);
  }
  const body = await request.get<unknown>(`/workspaces/${wsId}/attributes/available`);
  return unwrapList<AttributeDefinitionDto>(body).map(mapAttributeDefinitionFromApi);
}

export async function createAttributeDefinition(
  input: CreateAttributeDefinitionInput,
  workspaceId?: string,
): Promise<AttributeDefinition> {
  const wsId = requireWorkspaceId(workspaceId);
  if (USE_MOCKS) {
    const created: AttributeDefinition = {
      id: `attr-mock-${Date.now()}`,
      organizationId: 'org-fixture-1',
      scope: input.scope ?? 'WORKSPACE',
      workspaceId: input.scope === 'WORKSPACE' ? wsId : null,
      key: input.key,
      label: input.label,
      dataType: input.dataType,
      locked: input.locked ?? false,
      required: input.required,
      isActive: true,
      defaultValue: null,
      options: input.options ?? null,
    };
    mockDefinitions = [...mockDefinitions, created];
    return { ...created, options: created.options ? [...created.options] : null };
  }
  const body = await request.post<unknown>(`/workspaces/${wsId}/attributes`, mapCreateAttributeDefinitionToApi(input));
  return mapAttributeDefinitionFromApi(unwrapOne<AttributeDefinitionDto>(body));
}

export async function updateAttributeDefinition(
  definitionId: string,
  input: UpdateAttributeDefinitionInput,
  workspaceId?: string,
): Promise<AttributeDefinition> {
  const wsId = requireWorkspaceId(workspaceId);
  if (USE_MOCKS) {
    const idx = mockDefinitions.findIndex((d) => d.id === definitionId);
    if (idx < 0) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
    const existing = mockDefinitions[idx];
    if (existing.locked && existing.scope !== 'WORKSPACE') {
      const err = new Error('Attribute locked by higher tier');
      (err as Error & { code?: string }).code = 'ATTRIBUTE_LOCKED_BY_HIGHER_TIER';
      throw err;
    }
    const updated: AttributeDefinition = {
      ...existing,
      ...input,
      options: input.options !== undefined ? input.options : existing.options,
    };
    mockDefinitions = mockDefinitions.map((d, i) => (i === idx ? updated : d));
    return { ...updated, options: updated.options ? [...updated.options] : null };
  }
  const body = await request.patch<unknown>(
    `/workspaces/${wsId}/attributes/${definitionId}`,
    mapUpdateAttributeDefinitionToApi(input),
  );
  return mapAttributeDefinitionFromApi(unwrapOne<AttributeDefinitionDto>(body));
}

export async function deleteAttributeDefinition(
  definitionId: string,
  workspaceId?: string,
): Promise<void> {
  const wsId = requireWorkspaceId(workspaceId);
  if (USE_MOCKS) {
    const existing = mockDefinitions.find((d) => d.id === definitionId);
    if (!existing) return;
    if (existing.locked) {
      const err = new Error('Attribute locked by higher tier');
      (err as Error & { code?: string }).code = 'ATTRIBUTE_LOCKED_BY_HIGHER_TIER';
      throw err;
    }
    mockDefinitions = mockDefinitions.filter((d) => d.id !== definitionId);
    return;
  }
  await request.delete(`/workspaces/${wsId}/attributes/${definitionId}`);
}

export async function upsertTaskAttributeValue(
  taskId: string,
  definitionId: string,
  value: unknown,
  workspaceId?: string,
): Promise<void> {
  const wsId = requireWorkspaceId(workspaceId);
  if (USE_MOCKS) {
    const def = mockDefinitions.find((d) => d.id === definitionId);
    if (!def) throw Object.assign(new Error('Definition not found'), { code: 'NOT_FOUND' });
    if (!validateValueType(def.dataType, value)) {
      const err = new Error('Type mismatch');
      (err as Error & { code?: string }).code = 'ATTRIBUTE_TYPE_MISMATCH';
      throw err;
    }
    if (!mockValues[taskId]) mockValues[taskId] = {};
    if (value === null || value === undefined || value === '') {
      delete mockValues[taskId][definitionId];
    } else {
      mockValues[taskId][definitionId] = value;
    }
    return;
  }
  await request.put(`/workspaces/${wsId}/tasks/${taskId}/attributes/${definitionId}`, { value });
}

export async function clearTaskAttributeValue(
  taskId: string,
  definitionId: string,
  workspaceId?: string,
): Promise<void> {
  const wsId = requireWorkspaceId(workspaceId);
  if (USE_MOCKS) {
    if (mockValues[taskId]) delete mockValues[taskId][definitionId];
    return;
  }
  await request.delete(`/workspaces/${wsId}/tasks/${taskId}/attributes/${definitionId}`);
}

/** Mock-only read — no GET endpoint in frozen contract; values hydrate from upserts + fixtures. */
export function getMockTaskAttributeValue(taskId: string, definitionId: string): unknown {
  return mockValues[taskId]?.[definitionId];
}

/** Test helper — reset mock state. */
export function resetAttributeMocks(): void {
  mockDefinitions = [...MOCK_ATTRIBUTE_DEFINITIONS];
  for (const key of Object.keys(mockValues)) delete mockValues[key];
  Object.assign(mockValues, structuredClone(MOCK_ATTRIBUTE_VALUES));
}

export { isAttributeTypeMismatch };
