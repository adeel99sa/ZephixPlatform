import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import {
  useArtifactTreeKeydown,
  useProjectExpandKeydown,
  useWorkspaceExpandKeydown,
  type SidebarTreeKeyboardContext,
} from '../use-tree-roving-keydown';

function makeCtx(overrides: Partial<SidebarTreeKeyboardContext> = {}): SidebarTreeKeyboardContext {
  return {
    isProjectExpanded: vi.fn(() => false),
    expandProject: vi.fn(),
    collapseProject: vi.fn(),
    focusProjectRow: vi.fn(),
    focusWorkspaceRow: vi.fn(),
    focusFirstArtifact: vi.fn(),
    ...overrides,
  };
}

function ProjectExpandHarness({
  ctx,
  onReady,
}: {
  ctx: SidebarTreeKeyboardContext;
  onReady: (h: ReturnType<typeof useProjectExpandKeydown>) => void;
}) {
  const handler = useProjectExpandKeydown(ctx);
  onReady(handler);
  return null;
}

function WorkspaceExpandHarness({
  isExpanded,
  expand,
  collapse,
  focusWorkspace,
  focusFirstProject,
  onReady,
}: {
  isExpanded: (id: string) => boolean;
  expand: (id: string) => void;
  collapse: (id: string) => void;
  focusWorkspace: (id: string) => void;
  focusFirstProject: (id: string) => void;
  onReady: (h: ReturnType<typeof useWorkspaceExpandKeydown>) => void;
}) {
  const handler = useWorkspaceExpandKeydown(
    isExpanded,
    expand,
    collapse,
    focusWorkspace,
    focusFirstProject,
  );
  onReady(handler);
  return null;
}

function ArtifactTreeHarness({
  ctx,
  projectId,
  wsId,
}: {
  ctx: SidebarTreeKeyboardContext;
  projectId: string;
  wsId: string;
}) {
  const handler = useArtifactTreeKeydown(ctx);
  return (
    <div
      role="tree"
      onKeyDown={(e) => handler(e, projectId, wsId)}
    >
      <button type="button" role="treeitem">
        Item A
      </button>
      <button type="button" role="treeitem">
        Item B
      </button>
    </div>
  );
}

describe('useProjectExpandKeydown', () => {
  it('ArrowRight expands collapsed project', () => {
    const ctx = makeCtx({ isProjectExpanded: vi.fn(() => false) });
    let handler!: ReturnType<typeof useProjectExpandKeydown>;
    render(<ProjectExpandHarness ctx={ctx} onReady={(h) => { handler = h; }} />);
    const preventDefault = vi.fn();
    handler({ key: 'ArrowRight', preventDefault } as unknown as React.KeyboardEvent<HTMLButtonElement>, 'p1', 'ws1');
    expect(preventDefault).toHaveBeenCalled();
    expect(ctx.expandProject).toHaveBeenCalledWith('ws1', 'p1');
  });

  it('ArrowRight on expanded project focuses first artifact', () => {
    const ctx = makeCtx({ isProjectExpanded: vi.fn(() => true) });
    let handler!: ReturnType<typeof useProjectExpandKeydown>;
    render(<ProjectExpandHarness ctx={ctx} onReady={(h) => { handler = h; }} />);
    handler({ key: 'ArrowRight', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLButtonElement>, 'p1', 'ws1');
    expect(ctx.focusFirstArtifact).toHaveBeenCalledWith('p1');
  });

  it('ArrowLeft on expanded project collapses', () => {
    const ctx = makeCtx({ isProjectExpanded: vi.fn(() => true) });
    let handler!: ReturnType<typeof useProjectExpandKeydown>;
    render(<ProjectExpandHarness ctx={ctx} onReady={(h) => { handler = h; }} />);
    handler({ key: 'ArrowLeft', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLButtonElement>, 'p1', 'ws1');
    expect(ctx.collapseProject).toHaveBeenCalledWith('p1');
  });

  it('ArrowLeft on collapsed project focuses workspace', () => {
    const ctx = makeCtx({ isProjectExpanded: vi.fn(() => false) });
    let handler!: ReturnType<typeof useProjectExpandKeydown>;
    render(<ProjectExpandHarness ctx={ctx} onReady={(h) => { handler = h; }} />);
    handler({ key: 'ArrowLeft', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLButtonElement>, 'p1', 'ws1');
    expect(ctx.focusWorkspaceRow).toHaveBeenCalledWith('ws1');
  });
});

describe('useWorkspaceExpandKeydown', () => {
  it('ArrowRight expands collapsed workspace', () => {
    const expand = vi.fn();
    let handler!: ReturnType<typeof useWorkspaceExpandKeydown>;
    render(
      <WorkspaceExpandHarness
        isExpanded={() => false}
        expand={expand}
        collapse={vi.fn()}
        focusWorkspace={vi.fn()}
        focusFirstProject={vi.fn()}
        onReady={(h) => { handler = h; }}
      />,
    );
    handler({ key: 'ArrowRight', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLButtonElement>, 'ws1');
    expect(expand).toHaveBeenCalledWith('ws1');
  });

  it('ArrowRight on expanded workspace focuses first project', () => {
    const focusFirstProject = vi.fn();
    let handler!: ReturnType<typeof useWorkspaceExpandKeydown>;
    render(
      <WorkspaceExpandHarness
        isExpanded={() => true}
        expand={vi.fn()}
        collapse={vi.fn()}
        focusWorkspace={vi.fn()}
        focusFirstProject={focusFirstProject}
        onReady={(h) => { handler = h; }}
      />,
    );
    handler({ key: 'ArrowRight', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLButtonElement>, 'ws1');
    expect(focusFirstProject).toHaveBeenCalledWith('ws1');
  });

  it('ArrowLeft on expanded workspace collapses', () => {
    const collapse = vi.fn();
    let handler!: ReturnType<typeof useWorkspaceExpandKeydown>;
    render(
      <WorkspaceExpandHarness
        isExpanded={() => true}
        expand={vi.fn()}
        collapse={collapse}
        focusWorkspace={vi.fn()}
        focusFirstProject={vi.fn()}
        onReady={(h) => { handler = h; }}
      />,
    );
    handler({ key: 'ArrowLeft', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLButtonElement>, 'ws1');
    expect(collapse).toHaveBeenCalledWith('ws1');
  });
});

describe('useArtifactTreeKeydown', () => {
  it('ArrowDown moves focus to next sibling', () => {
    const ctx = makeCtx();
    render(<ArtifactTreeHarness ctx={ctx} projectId="p1" wsId="ws1" />);
    const items = screen.getAllByRole('treeitem');
    items[0].focus();
    fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
  });

  it('ArrowUp moves focus to previous sibling', () => {
    const ctx = makeCtx();
    render(<ArtifactTreeHarness ctx={ctx} projectId="p1" wsId="ws1" />);
    const items = screen.getAllByRole('treeitem');
    items[1].focus();
    fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('Home focuses first item', () => {
    const ctx = makeCtx();
    render(<ArtifactTreeHarness ctx={ctx} projectId="p1" wsId="ws1" />);
    const items = screen.getAllByRole('treeitem');
    items[1].focus();
    fireEvent.keyDown(screen.getByRole('tree'), { key: 'Home' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('End focuses last item', () => {
    const ctx = makeCtx();
    render(<ArtifactTreeHarness ctx={ctx} projectId="p1" wsId="ws1" />);
    const items = screen.getAllByRole('treeitem');
    items[0].focus();
    fireEvent.keyDown(screen.getByRole('tree'), { key: 'End' });
    expect(document.activeElement).toBe(items[1]);
  });

  it('ArrowLeft focuses project row and collapses when expanded', () => {
    const ctx = makeCtx({ isProjectExpanded: vi.fn(() => true) });
    render(<ArtifactTreeHarness ctx={ctx} projectId="p1" wsId="ws1" />);
    screen.getAllByRole('treeitem')[0].focus();
    fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowLeft' });
    expect(ctx.focusProjectRow).toHaveBeenCalledWith('p1');
    expect(ctx.collapseProject).toHaveBeenCalledWith('p1');
  });

  it('ArrowRight expands project when collapsed', () => {
    const ctx = makeCtx({ isProjectExpanded: vi.fn(() => false) });
    render(<ArtifactTreeHarness ctx={ctx} projectId="p1" wsId="ws1" />);
    screen.getAllByRole('treeitem')[0].focus();
    fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowRight' });
    expect(ctx.expandProject).toHaveBeenCalledWith('ws1', 'p1');
  });
});
