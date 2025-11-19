import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Workspace } from "@/lib/types";

interface WSState {
  workspaces: Workspace[];
  current?: Workspace;
  setWorkspaces: (w: Workspace[]) => void;
  setCurrent: (id: string) => void;
  addWorkspace: (w: Workspace) => void;
}

export const useWorkspaceStore = create<WSState>()(persist(
  (set, get) => ({
    workspaces: [],
    current: undefined,
    setWorkspaces: (w) => set({ workspaces: w, current: w[0] ?? get().current }),
    setCurrent: (id) => {
      const found = get().workspaces.find(x => x.id === id);
      if (found) set({ current: found });
    },
    addWorkspace: (w) => set({ workspaces: [w, ...get().workspaces], current: w }),
  }),
  { name: "zephix.ws" }
));
