/**
 * Phase 2G: Attachment Section
 *
 * Drop-in component for task details, risk panels, docs, etc.
 * Shows list + uploader (when canWrite is true).
 *
 * Usage:
 *   <AttachmentSection
 *     parentType="work_task"
 *     parentId={taskId}
 *     canWrite={isOwnerOrAdmin}
 *     currentUserId={userId}
 *     isAdmin={isAdmin}
 *   />
 */
import React, { useState } from "react";
import { AttachmentList } from "./AttachmentList";
import { AttachmentUploader } from "./AttachmentUploader";
import type { AttachmentParentType } from "./attachments.api";

interface AttachmentSectionProps {
  parentType: AttachmentParentType;
  parentId: string;
  canWrite?: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
}

export function AttachmentSection({
  parentType,
  parentId,
  canWrite = false,
  currentUserId,
  isAdmin = false,
}: AttachmentSectionProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ marginTop: 16 }}>
      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
        Attachments
      </h4>

      <AttachmentList
        parentType={parentType}
        parentId={parentId}
        canWrite={canWrite}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        refreshKey={refreshKey}
      />

      {canWrite && (
        <AttachmentUploader
          parentType={parentType}
          parentId={parentId}
          onUploaded={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
