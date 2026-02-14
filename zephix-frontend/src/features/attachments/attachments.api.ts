/**
 * Phase 2G: Attachments API Client
 */
import { request } from "@/lib/api";
import { useWorkspaceStore } from "@/state/workspace.store";

function requireWorkspace(): string {
  const ws = useWorkspaceStore.getState().activeWorkspace;
  if (!ws?.id) throw new Error("No active workspace");
  return ws.id;
}

// ── Types ────────────────────────────────────────────────────────────

export type AttachmentParentType = "work_task" | "work_risk" | "doc" | "comment";

export interface AttachmentDto {
  id: string;
  parentType: string;
  parentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploaderUserId: string;
  uploadedAt: string | null;
  status: string;
  createdAt: string;
}

export interface PresignResponse {
  attachment: AttachmentDto;
  presignedPutUrl: string;
}

// ── API Functions ────────────────────────────────────────────────────

export async function createPresign(data: {
  parentType: AttachmentParentType;
  parentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<PresignResponse> {
  const wsId = requireWorkspace();
  const res = await request.post(
    `/work/workspaces/${wsId}/attachments/presign`,
    data,
  );
  return res.data?.data ?? res.data;
}

export async function completeUpload(
  attachmentId: string,
  checksumSha256?: string,
): Promise<AttachmentDto> {
  const wsId = requireWorkspace();
  const res = await request.post(
    `/work/workspaces/${wsId}/attachments/${attachmentId}/complete`,
    { checksumSha256 },
  );
  return res.data?.data ?? res.data;
}

export async function listAttachments(
  parentType: AttachmentParentType,
  parentId: string,
): Promise<AttachmentDto[]> {
  const wsId = requireWorkspace();
  const res = await request.get(
    `/work/workspaces/${wsId}/attachments`,
    { params: { parentType, parentId } },
  );
  return res.data?.data ?? res.data ?? [];
}

export async function getDownloadUrl(
  attachmentId: string,
): Promise<{ downloadUrl: string; attachment: AttachmentDto }> {
  const wsId = requireWorkspace();
  const res = await request.get(
    `/work/workspaces/${wsId}/attachments/${attachmentId}/download`,
  );
  return res.data?.data ?? res.data;
}

export async function deleteAttachment(
  attachmentId: string,
): Promise<void> {
  const wsId = requireWorkspace();
  await request.delete(
    `/work/workspaces/${wsId}/attachments/${attachmentId}`,
  );
}

/**
 * Upload a file end-to-end:
 * 1. Create presign (backend)
 * 2. PUT file to S3 via presigned URL
 * 3. Call complete (backend)
 *
 * Returns the final attachment DTO.
 * onProgress callback receives 0..100.
 */
export async function uploadFile(
  parentType: AttachmentParentType,
  parentId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<AttachmentDto> {
  // Step 1: get presigned URL
  const presign = await createPresign({
    parentType,
    parentId,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });

  // Step 2: PUT directly to storage
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presign.presignedPutUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    });

    xhr.addEventListener("error", () => reject(new Error("Upload network error")));
    xhr.send(file);
  });

  // Step 3: mark complete
  const completed = await completeUpload(presign.attachment.id);
  return completed;
}
