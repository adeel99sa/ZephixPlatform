/**
 * Phase 2G: Attachment List Component
 *
 * Displays attached files for a parent item.
 * Supports download and delete (for uploader/admin/owner only).
 *
 * Props:
 * - parentType, parentId: identifies the parent item
 * - canWrite: controls whether upload/delete actions are shown
 * - currentUserId: for showing delete only on own uploads
 * - isAdmin: admin/owner can delete any attachment
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  listAttachments,
  getDownloadUrl,
  deleteAttachment,
  type AttachmentDto,
  type AttachmentParentType,
} from "./attachments.api";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentListProps {
  parentType: AttachmentParentType;
  parentId: string;
  canWrite?: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
  refreshKey?: number; // increment to force refresh
}

export function AttachmentList({
  parentType,
  parentId,
  canWrite = false,
  currentUserId,
  isAdmin = false,
  refreshKey = 0,
}: AttachmentListProps) {
  const [attachments, setAttachments] = useState<AttachmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await listAttachments(parentType, parentId);
      setAttachments(list);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to load attachments");
    } finally {
      setLoading(false);
    }
  }, [parentType, parentId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleDownload(att: AttachmentDto) {
    try {
      const result = await getDownloadUrl(att.id);
      window.open(result.downloadUrl, "_blank");
    } catch (err: any) {
      setError(err?.message || "Download failed");
    }
  }

  async function handleDelete(attId: string) {
    try {
      await deleteAttachment(attId);
      setAttachments((prev) => prev.filter((a) => a.id !== attId));
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    }
  }

  if (loading) return <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading attachments...</p>;
  if (error) return <p style={{ fontSize: 13, color: "#dc2626" }}>{error}</p>;
  if (attachments.length === 0) return <p style={{ fontSize: 13, color: "#9ca3af" }}>No attachments.</p>;

  return (
    <div>
      {attachments.map((att) => {
        const canDelete = canWrite && (isAdmin || att.uploaderUserId === currentUserId);
        return (
          <div
            key={att.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid #f3f4f6",
              fontSize: 13,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#3b82f6", cursor: "pointer", fontWeight: 500 }} onClick={() => handleDownload(att)}>
                {att.fileName}
              </span>
              <span style={{ color: "#9ca3af" }}>{formatSize(att.sizeBytes)}</span>
              {att.uploadedAt && (
                <span style={{ color: "#9ca3af" }}>
                  {new Date(att.uploadedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => handleDownload(att)}
                style={{ fontSize: 12, color: "#3b82f6", background: "none", border: "none", cursor: "pointer" }}
              >
                Download
              </button>
              {canDelete && (
                <button
                  onClick={() => handleDelete(att.id)}
                  style={{ fontSize: 12, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
