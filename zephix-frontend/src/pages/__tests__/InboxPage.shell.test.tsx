/**
 * Shell: Inbox list + detail split (Linear-style), not module grid.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import InboxPage from '../InboxPage';

vi.mock('@/lib/api', () => ({
  request: {
    get: vi.fn().mockResolvedValue({ notifications: [], nextCursor: null }),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({ updated: 0 }),
  },
}));

vi.mock('@/stores/uiStore', () => ({
  useUIStore: vi.fn(() => ({ addToast: vi.fn() })),
}));

vi.mock('@/hooks/useUnreadNotifications', () => ({
  useUnreadNotifications: vi.fn(() => ({ unreadCount: 0, refresh: vi.fn() })),
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
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('renders list/detail split and toolbar; no legacy module grid', async () => {
    renderInbox();
    expect(await screen.findByTestId('inbox-page')).toBeInTheDocument();
    expect(screen.getByTestId('inbox-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('inbox-split')).toBeInTheDocument();
    expect(screen.getByTestId('inbox-list-pane')).toBeInTheDocument();
    expect(screen.getByTestId('inbox-detail-pane')).toBeInTheDocument();
    expect(screen.queryByTestId('inbox-modules')).not.toBeInTheDocument();
    expect(screen.queryByTestId('inbox-setup-banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^Welcome to Zephix$/i })).not.toBeInTheDocument();
  });
});
