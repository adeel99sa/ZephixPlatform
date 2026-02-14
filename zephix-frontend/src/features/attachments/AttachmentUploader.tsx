/**
 * Phase 2G: Attachment Uploader Component
 *
 * File picker + progress bar + error display.
 * Uses presigned PUT flow: presign → PUT → complete.
 *
 * Props:
 * - parentType, parentId: identifies target parent
 * - onUploaded: callback when upload completes
 * - maxBytes: default 50 MB
 */
import React, { useRef, useState } from "react";
import {
  uploadFile,
  type AttachmentDto,
  type AttachmentParentType,
} from "./attachments.api";

/** Blocked extensions — mirrored from backend for instant feedback */
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".ps1", ".sh", ".vbs", ".js",
]);

const DEFAULT_MAX_BYTES = 52428800; // 50 MB

interface AttachmentUploaderProps {
  parentType: AttachmentParentType;
  parentId: string;
  onUploaded?: (attachment: AttachmentDto) => void;
  maxBytes?: number;
}

export function AttachmentUploader({
  parentType,
  parentId,
  onUploaded,
  maxBytes = DEFAULT_MAX_BYTES,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function getExtension(name: string): string {
    const idx = name.lastIndexOf(".");
    return idx >= 0 ? name.slice(idx).toLowerCase() : "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setProgress(0);

    // Client-side validation
    const ext = getExtension(file.name);
    if (BLOCKED_EXTENSIONS.has(ext)) {
      setError(`File type "${ext}" is not allowed.`);
      return;
    }
    if (file.size > maxBytes) {
      setError(`File too large. Maximum: ${(maxBytes / (1024 * 1024)).toFixed(0)} MB.`);
      return;
    }
    if (file.size === 0) {
      setError("Cannot upload an empty file.");
      return;
    }

    setUploading(true);
    try {
      const result = await uploadFile(parentType, parentId, file, setProgress);
      onUploaded?.(result);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          background: uploading ? "#d1d5db" : "#3b82f6",
          color: "#fff",
          borderRadius: 4,
          cursor: uploading ? "not-allowed" : "pointer",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {uploading ? `Uploading ${progress}%` : "Attach File"}
        <input
          ref={inputRef}
          type="file"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: "none" }}
        />
      </label>

      {uploading && (
        <div style={{ marginTop: 6, width: 200, height: 4, background: "#e5e7eb", borderRadius: 2 }}>
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "#3b82f6",
              borderRadius: 2,
              transition: "width 0.2s",
            }}
          />
        </div>
      )}

      {error && <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{error}</p>}
    </div>
  );
}
