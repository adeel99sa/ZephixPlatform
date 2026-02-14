/**
 * Phase 2A — Sidebar role-based visibility tests
 *
 * Validates:
 * 1. Sidebar does not render placeholder nav items (no "Coming soon" entries)
 * 2. Guest does not see Administration nav entry
 * 3. Guest does not see Template Center
 * 4. Member does not see Administration nav entry
 * 5. Admin sees Administration entry
 * 6. Guest does not see Members workspace nav
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';

// Mock all external dependencies
vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('@/stores/uiStore', () => ({
  useUIStore: vi.fn(() => ({ addToast: vi.fn() })),
}));

vi.mock('@/lib/telemetry', () => ({
  track: vi.fn(),
}));

vi.mock('@/hooks/useUnreadNotifications', () => ({
  useUnreadNotifications: vi.fn(() => ({ unreadCount: 0 })),
}));

vi.mock('@/lib/features', () => ({
  useProgramsPortfoliosEnabled: vi.fn(() => false),
}));

vi.mock('@/features/workspaces/SidebarWorkspaces', () => ({
  SidebarWorkspaces: () => <div data-testid="sidebar-workspaces" />,
}));

vi.mock('@/features/workspaces/WorkspaceCreateModal', () => ({
  WorkspaceCreateModal: () => null,
}));

vi.mock('@/features/workspaces/components/WorkspaceSettingsModal/controller', () => ({
  openWorkspaceSettingsModal: vi.fn(),
}));

vi.mock('@/features/workspaces/api', () => ({
  deleteWorkspace: vi.fn(),
}));

vi.mock('./UserProfileDropdown', () => ({
  UserProfileDropdown: () => <div data-testid="user-profile-dropdown" />,
}));

import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseWorkspaceStore = useWorkspaceStore as ReturnType<typeof vi.fn>;

function renderSidebar() {
  return render(
    <BrowserRouter>
      <Sidebar />
    </BrowserRouter>,
  );
}

describe('Sidebar — Phase 2A role gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWorkspaceStore.mockReturnValue({
      activeWorkspaceId: 'ws-1',
      setActiveWorkspace: vi.fn(),
    });
  });

  // ── 1. No placeholder nav items ─────────────────────────────────────
  it('does not render any "Coming soon" text in sidebar nav', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', platformRole: 'ADMIN', email: 'admin@test.com' },
    });
    renderSidebar();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  // ── 2. Guest does not see Administration ────────────────────────────
  it('guest does not see Administration nav entry', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', platformRole: 'VIEWER', email: 'guest@test.com' },
    });
    renderSidebar();
    expect(screen.queryByTestId('nav-administration')).not.toBeInTheDocument();
  });

  // ── 3. Guest does not see Template Center ───────────────────────────
  it('guest does not see Template Center', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', platformRole: 'VIEWER', email: 'guest@test.com' },
    });
    renderSidebar();
    expect(screen.queryByTestId('nav-templates')).not.toBeInTheDocument();
  });

  // ── 4. Member does not see Administration ───────────────────────────
  it('member does not see Administration nav entry', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', platformRole: 'MEMBER', email: 'member@test.com' },
    });
    renderSidebar();
    expect(screen.queryByTestId('nav-administration')).not.toBeInTheDocument();
  });

  // ── 5. Admin sees Administration ────────────────────────────────────
  it('admin sees Administration nav entry', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', platformRole: 'ADMIN', email: 'admin@test.com' },
    });
    renderSidebar();
    expect(screen.getByTestId('nav-administration')).toBeInTheDocument();
  });

  // ── 6. Guest does not see Members workspace nav ─────────────────────
  it('guest does not see Members in workspace nav', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', platformRole: 'VIEWER', email: 'guest@test.com' },
    });
    renderSidebar();
    expect(screen.queryByTestId('ws-nav-members')).not.toBeInTheDocument();
  });

  // ── 7. Admin sees workspace Dashboard and Members ───────────────────
  it('admin sees Dashboard and Members in workspace nav', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', platformRole: 'ADMIN', email: 'admin@test.com' },
    });
    renderSidebar();
    expect(screen.getByTestId('ws-nav-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('ws-nav-members')).toBeInTheDocument();
  });

  // ── 8. Guest does not see My Work or Inbox ──────────────────────────
  it('guest does not see My Work or Inbox', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', platformRole: 'VIEWER', email: 'guest@test.com' },
    });
    renderSidebar();
    expect(screen.queryByText('My Work')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-inbox')).not.toBeInTheDocument();
  });

  // ── 9. Member sees Template Center ──────────────────────────────────
  it('member sees Template Center', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', platformRole: 'MEMBER', email: 'member@test.com' },
    });
    renderSidebar();
    expect(screen.getByTestId('nav-templates')).toBeInTheDocument();
  });
});
