/**
 * Sprint 5.2a — Project artifacts API client.
 * Paths: /projects/:projectId/artifacts (workspace header required via api interceptor).
 */
import { api } from '@/lib/api';
import { unwrapArray, unwrapData } from '@/lib/api/unwrapData';

import { mapArtifact, mapArtifactItem, mapArtifactList } from './project-artifacts.mappers';
import type {
  ArtifactItemsPage,
  CreateArtifactInput,
  CreateArtifactItemInput,
  ListArtifactItemsParams,
  ProjectArtifact,
  ProjectArtifactItem,
  ProjectArtifactType,
  UpdateArtifactInput,
  UpdateArtifactItemInput,
} from './project-artifacts.types';

function basePath(projectId: string): string {
  return `/projects/${projectId}/artifacts`;
}

export async function listProjectArtifacts(
  projectId: string,
  type?: ProjectArtifactType,
): Promise<ProjectArtifact[]> {
  const qs = type ? `?type=${encodeURIComponent(type)}` : '';
  const res = await api.get<unknown>(`${basePath(projectId)}${qs}`);
  const data = unwrapData<unknown>(res) ?? res;
  if (Array.isArray(data)) return mapArtifactList(data);
  return mapArtifactList(unwrapArray<unknown>(res));
}

export async function getProjectArtifact(
  projectId: string,
  artifactId: string,
): Promise<ProjectArtifact | null> {
  const res = await api.get<unknown>(`${basePath(projectId)}/${artifactId}`);
  return mapArtifact(unwrapData(res) ?? res);
}

export async function createProjectArtifact(
  projectId: string,
  input: CreateArtifactInput,
): Promise<ProjectArtifact> {
  const res = await api.post<unknown>(`${basePath(projectId)}`, input);
  const mapped = mapArtifact(unwrapData(res) ?? res);
  if (!mapped) throw new Error('Invalid create artifact response');
  return mapped;
}

export async function updateProjectArtifact(
  projectId: string,
  artifactId: string,
  input: UpdateArtifactInput,
): Promise<ProjectArtifact> {
  const res = await api.patch<unknown>(`${basePath(projectId)}/${artifactId}`, input);
  const mapped = mapArtifact(unwrapData(res) ?? res);
  if (!mapped) throw new Error('Invalid update artifact response');
  return mapped;
}

export async function deleteProjectArtifact(
  projectId: string,
  artifactId: string,
): Promise<void> {
  await api.delete(`${basePath(projectId)}/${artifactId}`);
}

export async function reorderProjectArtifacts(
  projectId: string,
  artifactIds: string[],
): Promise<void> {
  await api.post(`${basePath(projectId)}/reorder`, { artifactIds });
}

export async function listArtifactItems(
  projectId: string,
  artifactId: string,
  params: ListArtifactItemsParams = {},
): Promise<ArtifactItemsPage> {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.assignee) search.set('assignee', params.assignee);
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  const qs = search.toString() ? `?${search.toString()}` : '';
  const res = await api.get<unknown>(`${basePath(projectId)}/${artifactId}/items${qs}`);
  const data = (unwrapData<Record<string, unknown>>(res) ?? res) as Record<string, unknown>;
  const itemsRaw = data.items ?? data;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map(mapArtifactItem).filter((i): i is ProjectArtifactItem => i != null)
    : [];
  return {
    items,
    total: typeof data.total === 'number' ? data.total : items.length,
    page: typeof data.page === 'number' ? data.page : 1,
    pageSize: typeof data.pageSize === 'number'
      ? data.pageSize
      : typeof data.page_size === 'number'
        ? data.page_size
        : items.length,
  };
}

export async function getArtifactItem(
  projectId: string,
  artifactId: string,
  itemId: string,
): Promise<ProjectArtifactItem | null> {
  const res = await api.get<unknown>(`${basePath(projectId)}/${artifactId}/items/${itemId}`);
  return mapArtifactItem(unwrapData(res) ?? res);
}

export async function createArtifactItem(
  projectId: string,
  artifactId: string,
  input: CreateArtifactItemInput,
): Promise<ProjectArtifactItem> {
  const res = await api.post<unknown>(`${basePath(projectId)}/${artifactId}/items`, input);
  const mapped = mapArtifactItem(unwrapData(res) ?? res);
  if (!mapped) throw new Error('Invalid create item response');
  return mapped;
}

export async function updateArtifactItem(
  projectId: string,
  artifactId: string,
  itemId: string,
  input: UpdateArtifactItemInput,
): Promise<ProjectArtifactItem> {
  const res = await api.patch<unknown>(
    `${basePath(projectId)}/${artifactId}/items/${itemId}`,
    input,
  );
  const mapped = mapArtifactItem(unwrapData(res) ?? res);
  if (!mapped) throw new Error('Invalid update item response');
  return mapped;
}

export async function deleteArtifactItem(
  projectId: string,
  artifactId: string,
  itemId: string,
): Promise<void> {
  await api.delete(`${basePath(projectId)}/${artifactId}/items/${itemId}`);
}

export async function reorderArtifactItems(
  projectId: string,
  artifactId: string,
  itemIds: string[],
): Promise<void> {
  await api.post(`${basePath(projectId)}/${artifactId}/items/reorder`, { itemIds });
}

export async function bulkCreateArtifactItems(
  projectId: string,
  artifactId: string,
  items: CreateArtifactItemInput[],
): Promise<ProjectArtifactItem[]> {
  const res = await api.post<unknown>(`${basePath(projectId)}/${artifactId}/items/bulk`, {
    items,
  });
  const data = unwrapData<unknown>(res) ?? res;
  if (Array.isArray(data)) {
    return data.map(mapArtifactItem).filter((i): i is ProjectArtifactItem => i != null);
  }
  return [];
}
