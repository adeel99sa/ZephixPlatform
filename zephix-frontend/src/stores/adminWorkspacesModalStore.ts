import { create } from "zustand";

/**
 * Global “Browse workspaces” modal for org admins.
 * Opens from the operational shell without navigating away from the current route.
 */
export type AdminWorkspacesModalState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const useAdminWorkspacesModalStore = create<AdminWorkspacesModalState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
