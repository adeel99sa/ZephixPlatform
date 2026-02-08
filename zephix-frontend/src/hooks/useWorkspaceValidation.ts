/**
 * Workspace Validation Hook
 * 
 * Validates that the persisted activeWorkspaceId still exists and is accessible.
 * If the workspace is no longer valid, clears it to trigger workspace selection.
 * 
 * This prevents WORKSPACE_REQUIRED errors from stale workspace IDs after:
 * - User is removed from a workspace
 * - Workspace is deleted
 * - User's organization changes
 */

import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { listWorkspaces, type Workspace } from '@/features/workspaces/api';
import { useAuth } from '@/state/AuthContext';

export interface WorkspaceValidationState {
  /** True while initial validation is in progress */
  isValidating: boolean;
  /** True if validation completed successfully */
  isValid: boolean;
  /** Error message if validation failed */
  error: string | null;
  /** List of accessible workspaces (cached after validation) */
  workspaces: Workspace[];
}

export interface UseWorkspaceValidationOptions {
  /** 
   * If false, validation is skipped entirely.
   * Use this to gate workspace validation behind onboarding completion.
   */
  enabled?: boolean;
}

/**
 * Hook to validate the persisted workspace ID on app load.
 * 
 * Should be called in DashboardLayout or a top-level provider.
 * Only runs validation once per mount, not on every render.
 * 
 * @param options.enabled - If false, validation is skipped (use for onboarding gate)
 */
export function useWorkspaceValidation(
  options: UseWorkspaceValidationOptions = {}
): WorkspaceValidationState {
  const { enabled = true } = options;
  const { user, loading: authLoading } = useAuth();
  const { activeWorkspaceId, setActiveWorkspace, isHydrating } = useWorkspaceStore();
  
  const [state, setState] = useState<WorkspaceValidationState>({
    isValidating: true,
    isValid: false,
    error: null,
    workspaces: [],
  });

  useEffect(() => {
    // If disabled (e.g., onboarding not complete), skip validation entirely
    if (!enabled) {
      setState({
        isValidating: false,
        isValid: false,
        error: null,
        workspaces: [],
      });
      return;
    }
    
    // Don't validate until auth is ready
    if (authLoading) return;
    
    // Don't validate until store is hydrated
    if (isHydrating) return;
    
    // If user not logged in, nothing to validate
    if (!user) {
      setState({
        isValidating: false,
        isValid: false,
        error: null,
        workspaces: [],
      });
      return;
    }

    // If no workspace ID is stored, nothing to validate
    if (!activeWorkspaceId) {
      setState({
        isValidating: false,
        isValid: true,
        error: null,
        workspaces: [],
      });
      return;
    }

    // Validate the stored workspace ID
    let cancelled = false;
    
    (async () => {
      try {
        const workspaces = await listWorkspaces();
        
        if (cancelled) return;
        
        // Check if the stored workspace is in the list
        const isAccessible = workspaces.some(w => w.id === activeWorkspaceId);
        
        if (!isAccessible) {
          // Workspace is no longer accessible - clear it
          console.warn(
            `[WorkspaceValidation] Stored workspace ${activeWorkspaceId} is no longer accessible. Clearing.`
          );
          setActiveWorkspace(null);
          
          // Also clear the legacy localStorage key
          try {
            localStorage.removeItem('zephix.lastWorkspaceId');
          } catch {}
        }
        
        setState({
          isValidating: false,
          isValid: isAccessible,
          error: null,
          workspaces,
        });
      } catch (err: any) {
        if (cancelled) return;
        
        // On error, don't clear the workspace - let the user retry
        console.error('[WorkspaceValidation] Failed to validate workspace:', err);
        setState({
          isValidating: false,
          isValid: false,
          error: err?.message || 'Failed to validate workspace',
          workspaces: [],
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, authLoading, isHydrating, user, activeWorkspaceId, setActiveWorkspace]);

  return state;
}

/**
 * Sync the Zustand store with the legacy localStorage key.
 * 
 * This ensures both storage mechanisms stay in sync:
 * - Zustand persist: workspace-storage
 * - Legacy: zephix.lastWorkspaceId
 */
export function syncWorkspaceStorage(workspaceId: string | null): void {
  try {
    if (workspaceId) {
      localStorage.setItem('zephix.lastWorkspaceId', workspaceId);
    } else {
      localStorage.removeItem('zephix.lastWorkspaceId');
    }
  } catch {
    // Ignore localStorage errors
  }
}
