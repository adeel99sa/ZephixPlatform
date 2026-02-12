/**
 * Documents API client
 */
import { request } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────

export interface DocumentItem {
  id: string;
  organizationId: string;
  workspaceId: string;
  projectId: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedByUserId: string;
  taskId: string | null;
  riskId: string | null;
  changeRequestId: string | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Normalizer ─────────────────────────────────────────────

function normalizeDoc(raw: Record<string, unknown>): DocumentItem {
  return {
    id: String(raw.id ?? ''),
    organizationId: String(raw.organizationId ?? raw.organization_id ?? ''),
    workspaceId: String(raw.workspaceId ?? raw.workspace_id ?? ''),
    projectId: String(raw.projectId ?? raw.project_id ?? ''),
    title: String(raw.title ?? ''),
    fileName: String(raw.fileName ?? raw.file_name ?? ''),
    mimeType: String(raw.mimeType ?? raw.mime_type ?? ''),
    sizeBytes: Number(raw.sizeBytes ?? raw.size_bytes ?? 0),
    storageKey: String(raw.storageKey ?? raw.storage_key ?? ''),
    uploadedByUserId: String(raw.uploadedByUserId ?? raw.uploaded_by_user_id ?? ''),
    taskId: (raw.taskId ?? raw.task_id ?? null) as string | null,
    riskId: (raw.riskId ?? raw.risk_id ?? null) as string | null,
    changeRequestId: (raw.changeRequestId ?? raw.change_request_id ?? null) as string | null,
    tags: (raw.tags ?? null) as string[] | null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ''),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ''),
  };
}

// ─── API Functions ──────────────────────────────────────────

export async function uploadDocument(
  projectId: string,
  file: File,
  options?: {
    title?: string;
    taskId?: string;
    riskId?: string;
    changeRequestId?: string;
  },
): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.title) formData.append('title', options.title);
  if (options?.taskId) formData.append('taskId', options.taskId);
  if (options?.riskId) formData.append('riskId', options.riskId);
  if (options?.changeRequestId) formData.append('changeRequestId', options.changeRequestId);

  const data = await request.post<Record<string, unknown>>(
    `/work/projects/${projectId}/documents`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return normalizeDoc(data as Record<string, unknown>);
}

export async function listDocuments(
  projectId: string,
  filters?: { changeRequestId?: string; taskId?: string },
): Promise<{ items: DocumentItem[]; total: number }> {
  const params: Record<string, string> = {};
  if (filters?.changeRequestId) params.changeRequestId = filters.changeRequestId;
  if (filters?.taskId) params.taskId = filters.taskId;

  const data = await request.get<Record<string, unknown>>(
    `/work/projects/${projectId}/documents`,
    { params },
  );
  const raw = data as Record<string, unknown>;
  const items = Array.isArray((raw as any).items)
    ? (raw as any).items.map((r: Record<string, unknown>) => normalizeDoc(r))
    : [];
  return { items, total: (raw as any).total ?? items.length };
}

export async function getDocument(id: string): Promise<DocumentItem> {
  const data = await request.get<Record<string, unknown>>(
    `/work/documents/${id}`,
  );
  return normalizeDoc(data as Record<string, unknown>);
}

export async function deleteDocument(id: string): Promise<void> {
  await request.delete(`/work/documents/${id}`);
}

export async function linkDocument(
  documentId: string,
  changeRequestId: string,
): Promise<DocumentItem> {
  const data = await request.patch<Record<string, unknown>>(
    `/work/documents/${documentId}/link`,
    { changeRequestId },
  );
  return normalizeDoc(data as Record<string, unknown>);
}

export function getDownloadUrl(id: string): string {
  return `/work/documents/${id}/download`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
