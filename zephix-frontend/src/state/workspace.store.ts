import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WorkspaceRole = 'workspace_owner' | 'workspace_member' | 'workspace_viewer' | 'delivery_owner' | 'stakeholder';

type WorkspaceMember = {
  id: string;
  userId: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
};

interface WorkspaceMemberCache {
  members: WorkspaceMember[];
  timestamp: number;
}

interface WorkspaceState {
  activeWorkspaceId: string | null;
  workspaceRole: WorkspaceRole | null;
  workspaceReady: boolean; // Patch 1: true only when activeWorkspaceId exists

  // PROMPT 4: Workspace hydration status
  isHydrating: boolean;
  lastHydratedAt: number | null;
  hydratedWorkspaceIds: Set<string>;

  // PHASE 7 MODULE 7.1 FIX: Member cache per workspace
  memberCache: Record<string, WorkspaceMemberCache>;

  setActiveWorkspace: (id: string | null) => void;
  clearActiveWorkspace: () => void;
  setWorkspaceRole: (role: WorkspaceRole | null) => void;

  // PROMPT 4: Hydration methods
  setHydrating: (isHydrating: boolean) => void;
  markWorkspaceHydrated: (workspaceId: string) => void;
  clearHydration: () => void;

  // PHASE 7 MODULE 7.1 FIX: Member cache methods
  setWorkspaceMembers: (workspaceId: string, members: WorkspaceMember[]) => void;
  getWorkspaceMembers: (workspaceId: string) => WorkspaceMember[] | null;

  // Derived flags - Sprint 6
  isReadOnly: boolean;
  canWrite: boolean;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      activeWorkspaceId: null,
      workspaceRole: null,
      workspaceReady: false, // Patch 1: computed from activeWorkspaceId
      isReadOnly: false,
      canWrite: false,

      // PROMPT 4: Hydration state
      isHydrating: false,
      lastHydratedAt: null,
      hydratedWorkspaceIds: new Set<string>(),

      // PHASE 7 MODULE 7.1 FIX: Member cache
      memberCache: {},

      setActiveWorkspace: (id) => set({
        activeWorkspaceId: id,
        workspaceReady: !!id, // Patch 1: workspaceReady true only when id exists
      }),
      clearActiveWorkspace: () => set({
        activeWorkspaceId: null,
        workspaceReady: false,
        workspaceRole: null,
      }),
      setWorkspaceRole: (role) => {
        const isReadOnly = role === 'stakeholder' || role === 'workspace_viewer';
        const canWrite = role === 'delivery_owner' || role === 'workspace_owner';
        set({ workspaceRole: role, isReadOnly, canWrite });
      },

      // PROMPT 4: Hydration methods
      setHydrating: (isHydrating: boolean) => set({ isHydrating }),
      markWorkspaceHydrated: (workspaceId: string) => {
        const current = get().hydratedWorkspaceIds;
        const updated = new Set(current);
        updated.add(workspaceId);
        set({
          hydratedWorkspaceIds: updated,
          lastHydratedAt: Date.now(),
          isHydrating: false,
        });
      },
      clearHydration: () => set({
        isHydrating: false,
        hydratedWorkspaceIds: new Set(),
        lastHydratedAt: null,
      }),

      // PHASE 7 MODULE 7.1 FIX: Member cache methods (5 minute TTL)
      setWorkspaceMembers: (workspaceId, members) => {
        const cache: WorkspaceMemberCache = {
          members,
          timestamp: Date.now(),
        };
        set((state) => ({
          memberCache: {
            ...state.memberCache,
            [workspaceId]: cache,
          },
        }));
      },
      getWorkspaceMembers: (workspaceId) => {
        const state = get();
        const cache = state.memberCache[workspaceId];
        const TTL = 5 * 60 * 1000; // 5 minutes
        if (cache && Date.now() - cache.timestamp < TTL) {
          return cache.members;
        }
        return null;
      },
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        activeWorkspaceId: state.activeWorkspaceId,
        // Don't persist role or hydration state - fetch fresh on load
      }),
    }
  )
);

