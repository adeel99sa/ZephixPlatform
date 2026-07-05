/**
 * CI gating — resizable app sidebar (locked shell contract).
 *
 * DO NOT remove drag resize, hover tooltip, double-click reset, or ⌘\ close
 * without product/architect sign-off. See DashboardLayout + SidebarResizeHandle.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { SidebarResizeHandle } from '../SidebarResizeHandle';
import {
  SIDEBAR_DEFAULT_PX,
  SIDEBAR_WIDTH_STORAGE_KEY,
} from '@/hooks/useResizableSidebar';

describe('SidebarResizeHandle (gating — locked shell contract)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
      x: 280,
      y: 0,
      width: 4,
      height: 800,
      top: 0,
      left: 280,
      right: 284,
      bottom: 800,
      toJSON: () => ({}),
    }));
  });

  it('renders the resize separator with data-testid sidebar-resize-handle', () => {
    render(
      <SidebarResizeHandle
        onPointerDown={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
        isDragging={false}
      />,
    );
    expect(screen.getByTestId('sidebar-resize-handle')).toHaveAttribute('role', 'separator');
  });

  it('shows ClickUp-style tooltip on hover (Close / Resize / Reset hints)', async () => {
    const user = userEvent.setup();
    render(
      <SidebarResizeHandle
        onPointerDown={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
        isDragging={false}
      />,
    );

    await user.hover(screen.getByTestId('sidebar-resize-handle'));

    expect(await screen.findByTestId('sidebar-resize-tooltip')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.getByText('Resize')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
    expect(screen.getByText('Drag')).toBeInTheDocument();
    expect(screen.getByText('Double-click')).toBeInTheDocument();
    expect(screen.getByText('⌘ \\')).toBeInTheDocument();
  });

  it('double-click invokes onReset', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(
      <SidebarResizeHandle
        onPointerDown={vi.fn()}
        onReset={onReset}
        onClose={vi.fn()}
        isDragging={false}
      />,
    );

    await user.dblClick(screen.getByTestId('sidebar-resize-handle'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('exports stable sidebar width constants for reset persistence', () => {
    expect(SIDEBAR_DEFAULT_PX).toBe(288);
    expect(SIDEBAR_WIDTH_STORAGE_KEY).toBe('zephix-sidebar-width-px');
  });
});
