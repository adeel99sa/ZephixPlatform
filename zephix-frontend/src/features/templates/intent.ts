// zephix-frontend/src/features/templates/intent.ts
import { useWorkspaceStore } from "@/state/workspace.store";
import { applyTemplate } from "./api";

export async function applyTemplateWithWorkspace({
  templateId,
  type, // "project" | "dashboard" | ...
  preferredWorkspaceId, // optional
  onRequireWorkspace,   // () => Promise<string> (open modal, return new/existing wsId)
}: {
  templateId: string;
  type: string;
  preferredWorkspaceId?: string | null;
  onRequireWorkspace: () => Promise<string>;
}) {
  const active = useWorkspaceStore.getState().activeWorkspaceId ?? preferredWorkspaceId;
  const workspaceId = active ?? await onRequireWorkspace(); // invokes your modal
  useWorkspaceStore.getState().setActiveWorkspace(workspaceId);
  return applyTemplate(type, { templateId, workspaceId });
}

