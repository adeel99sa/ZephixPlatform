import { create } from "zustand";

/** Pass as `nextRoute` on WorkspaceCreateModal to open Template Center after create */
export const WORKSPACE_CREATE_NEXT_TEMPLATE_CENTER = "__TEMPLATE_CENTER__" as const;

type TemplateCenterModalState = {
  open: boolean;
  /** Workspace to preselect when opening (e.g. row that triggered the action) */
  initialWorkspaceId: string | undefined;
  openTemplateCenter: (workspaceId?: string) => void;
  closeTemplateCenter: () => void;
};

export const useTemplateCenterModalStore = create<TemplateCenterModalState>((set) => ({
  open: false,
  initialWorkspaceId: undefined,
  openTemplateCenter: (workspaceId) =>
    set({ open: true, initialWorkspaceId: workspaceId }),
  closeTemplateCenter: () =>
    set({ open: false, initialWorkspaceId: undefined }),
}));
