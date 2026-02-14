/**
 * Response DTO for attachment metadata.
 * Never exposes raw storageKey or bucket — only attachmentId and display fields.
 */
export interface AttachmentResponseDto {
  id: string;
  parentType: string;
  parentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploaderUserId: string;
  uploadedAt: string | null;
  status: string;
  retentionDays: number | null;
  expiresAt: string | null;
  lastDownloadedAt: string | null;
  createdAt: string;
}

export function toAttachmentDto(a: any): AttachmentResponseDto {
  return {
    id: a.id,
    parentType: a.parentType,
    parentId: a.parentId,
    fileName: a.fileName,
    mimeType: a.mimeType,
    sizeBytes: Number(a.sizeBytes),
    uploaderUserId: a.uploaderUserId,
    uploadedAt: a.uploadedAt ? new Date(a.uploadedAt).toISOString() : null,
    status: a.status,
    retentionDays: a.retentionDays ?? null,
    expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString() : null,
    lastDownloadedAt: a.lastDownloadedAt ? new Date(a.lastDownloadedAt).toISOString() : null,
    createdAt: new Date(a.createdAt).toISOString(),
  };
}
