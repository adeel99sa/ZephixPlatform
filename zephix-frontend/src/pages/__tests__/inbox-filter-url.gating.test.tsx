/**
 * PR-2a — Inbox filter URL sync gating.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Routes,
  Route,
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import InboxPage from '@/pages/InboxPage';
import {
  applyInboxFilterToSearchParams,
  parseInboxFilterFromSearchParams,
} from '@/pages/inboxFilterParams';

const requestGet = vi.fn();
const requestPatch = vi.fn();
const requestPost = vi.fn();

vi.mock('@/lib/api', () => ({
  request: {
    get: (...args: unknown[]) => requestGet(...args),
    post: (...args: unknown[]) => requestPost(...args),
    patch: (...args: unknown[]) => requestPatch(...args),
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

vi.mock('@/features/notifications/api/useNotifications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/notifications/api/useNotifications')>();
  return {
    ...actual,
    invalidateNotificationsQueryCache: vi.fn(),
  };
});

/** Mirrors Sidebar `nav-inbox` NavLink target (pathname + empty search). */
function SidebarInboxNavStub() {
  return (
    <NavLink data-testid="nav-inbox" to={{ pathname: '/inbox', search: '' }}>
      Inbox
    </NavLink>
  );
}

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location-search" data-search={location.search} aria-hidden />
  );
}

function HistoryBackButton() {
  const navigate = useNavigate();
  return (
    <button type="button" data-testid="history-back" onClick={() => navigate(-1)}>
      Back
    </button>
  );
}

function renderInboxAt(initialPath: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <LocationProbe />
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('inboxFilterParams gating', () => {
  it('parses URL filter param with all as default', () => {
    expect(parseInboxFilterFromSearchParams(new URLSearchParams(''))).toBe('all');
    expect(parseInboxFilterFromSearchParams(new URLSearchParams('filter=unread'))).toBe('unread');
    expect(parseInboxFilterFromSearchParams(new URLSearchParams('filter=dismissed'))).toBe(
      'dismissed',
    );
    expect(parseInboxFilterFromSearchParams(new URLSearchParams('filter=invalid'))).toBe('all');
  });

  it('applyInboxFilterToSearchParams omits param for all', () => {
    const base = new URLSearchParams('filter=dismissed&foo=bar');
    const all = applyInboxFilterToSearchParams(base, 'all');
    expect(all.filter).toBeUndefined();
    expect(all.foo).toBe('bar');

    const unread = applyInboxFilterToSearchParams(new URLSearchParams(), 'unread');
    expect(unread.filter).toBe('unread');
  });
});

describe('InboxPage filter URL sync gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestGet.mockResolvedValue({ notifications: [], nextCursor: null });
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

  it('derives filter from URL and fetches status=dismissed', async () => {
    renderInboxAt('/inbox?filter=dismissed');

    await waitFor(() => {
      expect(requestGet).toHaveBeenCalledWith(
        expect.stringContaining('status=dismissed'),
      );
    });
    expect(screen.getByTestId('location-search')).toHaveAttribute(
      'data-search',
      '?filter=dismissed',
    );
  });

  it('applyTab writes filter to URL search param', async () => {
    const user = userEvent.setup();
    renderInboxAt('/inbox');

    await user.click(screen.getByTestId('inbox-filter-trigger'));
    await user.click(screen.getByTestId('inbox-filter-dismissed'));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveAttribute(
        'data-search',
        '?filter=dismissed',
      );
    });
    await waitFor(() => {
      expect(requestGet).toHaveBeenCalledWith(expect.stringContaining('status=dismissed'));
    });
  });

  it('empty-state link navigates via URL to dismissed filter', async () => {
    const user = userEvent.setup();
    requestGet.mockImplementation(async (url: string) => {
      if (url.includes('status=dismissed')) {
        return {
          notifications: [
            {
              id: 'd1',
              title: 'D',
              body: null,
              data: {},
              priority: 'normal',
              read: false,
              createdAt: new Date().toISOString(),
              eventType: 'X',
            },
          ],
          nextCursor: null,
        };
      }
      return { notifications: [], nextCursor: null };
    });

    renderInboxAt('/inbox');

    await waitFor(() => {
      expect(screen.getByTestId('inbox-view-dismissed-link')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('inbox-view-dismissed-link'));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveAttribute(
        'data-search',
        '?filter=dismissed',
      );
    });
  });

  it('sidebar Inbox link resets to /inbox (all filter) from dismissed URL', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/inbox?filter=dismissed']}>
          <SidebarInboxNavStub />
          <LocationProbe />
          <Routes>
            <Route path="/inbox" element={<InboxPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(requestGet).toHaveBeenCalledWith(expect.stringContaining('status=dismissed'));
    });

    await user.click(screen.getByTestId('nav-inbox'));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveAttribute('data-search', '');
    });
    await waitFor(() => {
      expect(requestGet).toHaveBeenCalledWith(expect.stringContaining('status=all'));
    });
  });

  it('browser back restores previous filter from history', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/inbox']}>
          <HistoryBackButton />
          <LocationProbe />
          <Routes>
            <Route path="/inbox" element={<InboxPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.click(screen.getByTestId('inbox-filter-trigger'));
    await user.click(screen.getByTestId('inbox-filter-dismissed'));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveAttribute(
        'data-search',
        '?filter=dismissed',
      );
    });

    await user.click(screen.getByTestId('inbox-filter-trigger'));
    await user.click(screen.getByRole('menuitem', { name: /All notifications/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveAttribute('data-search', '');
    });

    await user.click(screen.getByTestId('history-back'));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveAttribute(
        'data-search',
        '?filter=dismissed',
      );
    });
  });
});
