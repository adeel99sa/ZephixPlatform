import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Workspace } from "@/lib/types";
import { isWorkspaceStoreReadOnlyRole, isWorkspaceStoreWriterRole } from "@/utils/access";

export type WorkspaceRole = 'workspace_owner' | 'workspace_member' | 'workspace_viewer' | 'delivery_owner' | 'stakeholder';

interface WSState {
  workspaces: Workspace[];
  current?: Workspace;
  workspaceRole: WorkspaceRole | null;
  setWorkspaces: (w: Workspace[]) => void;
  setCurrent: (id: string) => void;
  addWorkspace: (w: Workspace) => void;
  setWorkspaceRole: (role: WorkspaceRole | null) => void;
  // Derived flags - Sprint 6
  isReadOnly: boolean;
  canWrite: boolean;
}

export const useWorkspaceStore = create<WSState>()(persist(
  (set, get) => ({
    workspaces: [],
    current: undefined,
    workspaceRole: null,
    setWorkspaces: (w) => set({ workspaces: w, current: w[0] ?? get().current }),
    setCurrent: (id) => {
      const found = get().workspaces.find(x => x.id === id);
      if (found) set({ current: found });
    },
    addWorkspace: (w) => set({ workspaces: [w, ...get().workspaces], current: w }),
    setWorkspaceRole: (role) => {
      const isReadOnly = isWorkspaceStoreReadOnlyRole(role);
      const canWrite = isWorkspaceStoreWriterRole(role);
      set({ workspaceRole: role, isReadOnly, canWrite });
    },
    // Derived flags computed from workspaceRole
    get isReadOnly() {
      const role = get().workspaceRole;
      return isWorkspaceStoreReadOnlyRole(role);
    },
    get canWrite() {
      const role = get().workspaceRole;
      return isWorkspaceStoreWriterRole(role);
    },
  }),
  {
    name: "zephix.ws",
    partialize: (state) => ({
      workspaces: state.workspaces,
      current: state.current,
      // Don't persist role - fetch fresh on load
    }),
  }
));
