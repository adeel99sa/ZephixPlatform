import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Sidebar Workspace section (settings menu) display preferences for the picker list.
 * Persisted locally — affects workspace picker list only (no backend).
 */
type SidebarWorkspacesUiState = {
  /** When false, the picker lists favorited workspaces plus the active one only. */
  showAllWorkspacesInPicker: boolean;
  /** When true, include soft-deleted workspaces if the list API returns them. */
  showArchivedWorkspaces: boolean;
  setShowAllWorkspacesInPicker: (value: boolean) => void;
  setShowArchivedWorkspaces: (value: boolean) => void;
};

export const useSidebarWorkspacesUiStore = create<SidebarWorkspacesUiState>()(
  persist(
    (set) => ({
      showAllWorkspacesInPicker: true,
      showArchivedWorkspaces: false,
      setShowAllWorkspacesInPicker: (showAllWorkspacesInPicker) => set({ showAllWorkspacesInPicker }),
      setShowArchivedWorkspaces: (showArchivedWorkspaces) => set({ showArchivedWorkspaces }),
    }),
    { name: 'zephix-sidebar-workspaces-ui' },
  ),
);
