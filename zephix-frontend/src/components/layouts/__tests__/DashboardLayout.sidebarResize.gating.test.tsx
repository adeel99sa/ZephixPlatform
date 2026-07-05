/**
 * CI gating — DashboardLayout wires resizable sidebar shell (locked contract).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import DashboardLayout from '../DashboardLayout';

vi.mock('@/components/shell/Header', () => ({ Header: () => <div data-testid="header">header</div> }));
vi.mock('@/components/shell/NavigationRecentsTracker', () => ({
  NavigationRecentsTracker: () => null,
}));
vi.mock('@/components/shell/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">sidebar</div>,
}));
vi.mock('@/components/shell/DemoBanner', () => ({ default: () => null }));
vi.mock('@/hooks/useWorkspaceValidation', () => ({
  useWorkspaceValidation: vi.fn(),
}));
vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(() => ({ activeWorkspaceId: 'ws-1' })),
}));
vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));
vi.mock('@/features/organizations/useOrgHomeState', () => ({
  useOrgHomeState: vi.fn(),
}));

import { useAuth } from '@/state/AuthContext';
import { useOrgHomeState } from '@/features/organizations/useOrgHomeState';

const mockUseAuth = vi.mocked(useAuth);
const mockUseOrgHomeState = vi.mocked(useOrgHomeState);

function renderShell() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<div>HOME</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('DashboardLayout — resizable sidebar shell (gating)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'u-1', email: 'admin@z.dev', platformRole: 'ADMIN' },
    } as never);
    mockUseOrgHomeState.mockReturnValue({
      isLoading: false,
      onboardingStatus: 'completed',
      workspaceCount: 1,
    } as never);
    window.localStorage.removeItem('zephix-sidebar-width-px');
  });

  it('mounts sidebar shell with resize handle when sidebar is open', () => {
    renderShell();

    expect(screen.getByTestId('sidebar-shell')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-resize-handle')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('sidebar shell uses dynamic width (not fixed Tailwind w-72 on layout wrapper)', () => {
    renderShell();
    const shell = screen.getByTestId('sidebar-shell');
    expect(shell.style.width).toBeTruthy();
    expect(shell.className).not.toMatch(/\bw-72\b/);
  });
});
