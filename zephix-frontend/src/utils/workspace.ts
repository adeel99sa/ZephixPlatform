/**
 * Workspace utility functions
 * Centralized source of truth for workspace ID
 */
import { useWorkspaceStore } from '@/state/workspace.store';

/**
 * Get the currently active workspace ID
 * Returns null if no workspace is selected
 */
export function getActiveWorkspaceId(): string | null {
  const store = useWorkspaceStore.getState();
  return store.activeWorkspaceId;
}

/**
 * Require an active workspace ID
 * Throws error if no workspace is selected
 */
export function requireWorkspace(): string {
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) {
    throw new Error('Workspace required. Please select a workspace first.');
  }
  return workspaceId;
}

/**
 * Check if a workspace is currently selected
 */
export function hasActiveWorkspace(): boolean {
  return getActiveWorkspaceId() !== null;
}
