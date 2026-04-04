/**
 * Shell: Inbox operational surface (modules + feed), not welcome-only.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import InboxPage from '../InboxPage';

vi.mock('@/lib/api', () => ({
  request: {
    get: vi.fn().mockResolvedValue({ notifications: [], nextCursor: null }),
    post: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/stores/uiStore', () => ({
  useUIStore: vi.fn(() => ({ addToast: vi.fn() })),
}));

vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: '1', platformRole: 'ADMIN', role: 'admin' } })),
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(() => ({ setActiveWorkspace: vi.fn() })),
}));

vi.mock('@/features/organizations/useOrgHomeState', () => ({
  useOrgHomeState: vi.fn(() => ({ workspaceCount: 0, isLoading: false })),
}));

vi.mock('@/hooks/useUnreadNotifications', () => ({
  useUnreadNotifications: vi.fn(() => ({ unreadCount: 0, refresh: vi.fn() })),
}));

vi.mock('@/utils/access', () => ({
  isPlatformAdmin: vi.fn(() => true),
}));

vi.mock('@/features/workspaces/WorkspaceCreateModal', () => ({
  WorkspaceCreateModal: () => null,
}));

vi.mock('@/lib/telemetry', () => ({
  track: vi.fn(),
}));

function renderInbox() {
  return render(
    <MemoryRouter>
      <InboxPage />
    </MemoryRouter>,
  );
}

describe('InboxPage shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders operational module grid, not welcome-only content', async () => {
    renderInbox();
    expect(await screen.findByTestId('inbox-modules')).toBeInTheDocument();
    expect(screen.getByTestId('inbox-module-assignments')).toBeInTheDocument();
    expect(screen.getByTestId('inbox-feed')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^Welcome to Zephix$/i })).not.toBeInTheDocument();
  });
});
