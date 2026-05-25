import { useCallback } from 'react';

export type SidebarTreeKeyboardContext = {
  isProjectExpanded: (projectId: string) => boolean;
  expandProject: (wsId: string, projectId: string) => void;
  collapseProject: (projectId: string) => void;
  focusProjectRow: (projectId: string) => void;
  focusWorkspaceRow: (wsId: string) => void;
  focusFirstArtifact: (projectId: string) => void;
};

function focusSelector(root: ParentNode, selector: string): boolean {
  const el = root.querySelector<HTMLElement>(selector);
  if (el) {
    el.focus();
    return true;
  }
  return false;
}

/** Artifact tree: sibling roving + hierarchical Left/Right (Sprint 5.2a WCAG). */
export function useArtifactTreeKeydown(ctx: SidebarTreeKeyboardContext) {
  return useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, projectId: string, wsId: string) => {
      const tree = e.currentTarget;
      const items = Array.from(
        tree.querySelectorAll<HTMLElement>('[role="treeitem"]:not([disabled])'),
      );
      const active = document.activeElement as HTMLElement | null;
      const idx = active ? items.indexOf(active) : -1;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = idx < items.length - 1 ? idx + 1 : 0;
        items[next]?.focus();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const next = idx > 0 ? idx - 1 : items.length - 1;
        items[next]?.focus();
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        items[0]?.focus();
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1]?.focus();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        ctx.focusProjectRow(projectId);
        if (ctx.isProjectExpanded(projectId)) {
          ctx.collapseProject(projectId);
        }
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (!ctx.isProjectExpanded(projectId)) {
          ctx.expandProject(wsId, projectId);
        } else if (items.length > 0) {
          items[0]?.focus();
        }
      }
    },
    [ctx],
  );
}

export function useProjectExpandKeydown(ctx: SidebarTreeKeyboardContext) {
  return useCallback(
    (
      e: React.KeyboardEvent<HTMLButtonElement>,
      projectId: string,
      wsId: string,
    ) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (!ctx.isProjectExpanded(projectId)) {
          ctx.expandProject(wsId, projectId);
        } else {
          ctx.focusFirstArtifact(projectId);
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (ctx.isProjectExpanded(projectId)) {
          ctx.collapseProject(projectId);
        } else {
          ctx.focusWorkspaceRow(wsId);
        }
      }
    },
    [ctx],
  );
}

export function useWorkspaceExpandKeydown(
  isExpanded: (wsId: string) => boolean,
  expandWorkspace: (wsId: string) => void,
  collapseWorkspace: (wsId: string) => void,
  focusWorkspaceRow: (wsId: string) => void,
  focusFirstProject: (wsId: string) => void,
) {
  return useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, wsId: string) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (!isExpanded(wsId)) {
          expandWorkspace(wsId);
        } else {
          focusFirstProject(wsId);
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (isExpanded(wsId)) {
          collapseWorkspace(wsId);
        } else {
          focusWorkspaceRow(wsId);
        }
      }
    },
    [isExpanded, expandWorkspace, collapseWorkspace, focusWorkspaceRow, focusFirstProject],
  );
}
