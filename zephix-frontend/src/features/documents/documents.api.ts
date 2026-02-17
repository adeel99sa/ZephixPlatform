import { request } from '@/lib/api';
import { useWorkspaceStore } from '@/state/workspace.store';
import type { Document, CreateDocumentInput, UpdateDocumentInput } from './types';

function requireWorkspace(): string {
  const wsId = useWorkspaceStore.getState().activeWorkspaceId;
  if (!wsId) throw new Error('WORKSPACE_REQUIRED');
  return wsId;
}

function basePath(projectId: string): string {
  const wsId = requireWorkspace();
  return `/work/workspaces/${wsId}/projects/${projectId}/documents`;
}

export async function listDocuments(projectId: string): Promise<Document[]> {
  return request.get<Document[]>(basePath(projectId));
}

export async function getDocument(projectId: string, id: string): Promise<Document> {
  return request.get<Document>(`${basePath(projectId)}/${id}`);
}

export async function createDocument(
  projectId: string,
  input: CreateDocumentInput,
): Promise<Document> {
  return request.post<Document>(basePath(projectId), input);
}

export async function updateDocument(
  projectId: string,
  id: string,
  input: UpdateDocumentInput,
): Promise<Document> {
  return request.patch<Document>(`${basePath(projectId)}/${id}`, input);
}

export async function deleteDocument(projectId: string, id: string): Promise<void> {
  await request.delete(`${basePath(projectId)}/${id}`);
}
