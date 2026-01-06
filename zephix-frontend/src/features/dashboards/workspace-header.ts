// Phase 4.3: Workspace Header Enforcement
import { useWorkspaceStore } from "@/state/workspace.store";
import { WorkspaceRequiredError } from "./schemas";

// Re-export for convenience
export { WorkspaceRequiredError };

/**
 * Get workspace header for dashboard API requests
 * Throws WorkspaceRequiredError if no workspace is selected
 */
export function getWorkspaceHeader(): { "x-workspace-id": string } {
  const { activeWorkspaceId } = useWorkspaceStore.getState();

  if (!activeWorkspaceId) {
    throw new WorkspaceRequiredError();
  }

  return {
    "x-workspace-id": activeWorkspaceId,
  };
}

/**
 * Hook version for use in components
 */
export function useWorkspaceHeader(): { "x-workspace-id": string } | null {
  const { activeWorkspaceId } = useWorkspaceStore();

  if (!activeWorkspaceId) {
    return null;
  }

  return {
    "x-workspace-id": activeWorkspaceId,
  };
}

