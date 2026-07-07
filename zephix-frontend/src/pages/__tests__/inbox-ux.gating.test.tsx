/**
 * PR-2 — Inbox UX completion gating.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import InboxPage from '@/pages/InboxPage';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import {
  buildTaskDeepLink,
  mapNotificationItem,
  parseNotificationsListResponse,
} from '@/features/notifications/api/notificationMappers';

const WS = '84d46f51-7ea4-436c-9af4-ad744a18d29d';
const PROJECT = '4ba319ba-2ae8-4d20-9fba-3a49090e9041';
const TASK = '8e833c78-4294-49f2-ac75-b333ba3d54ac';

const ACTIVE_ROW = {
  id: 'notif-active-1',
  eventType: 'TASK_STATUS_CHANGED',
  title: 'sandbox.admin moved Governance proof task 1 to DONE',
  body: 'In Gov Test Project',
  data: { taskId: TASK, projectId: PROJECT },
  priority: 'normal',
  createdAt: '2026-07-06T02:30:57.726Z',
  read: false,
  workspaceId: WS,
};

const DISMISSED_ROW = {
  ...ACTIVE_ROW,
  id: 'notif-dismissed-1',
  title: 'Dismissed notification',
};

const requestGet = vi.fn();
const requestPatch = vi.fn();
const requestPost = vi.fn();
const invalidateSpy = vi.fn();

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
  useUnreadNotifications: vi.fn(() => ({ unreadCount: 1, refresh: vi.fn() })),
}));

vi.mock('@/lib/telemetry', () => ({
  track: vi.fn(),
}));

vi.mock('@/features/notifications/api/useNotifications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/notifications/api/useNotifications')>();
  return {
    ...actual,
    useNotifications: vi.fn(),
    useUnreadCount: vi.fn(() => ({ data: 1 })),
    useMarkAsRead: vi.fn(() => ({ mutate: vi.fn() })),
    useMarkAllAsRead: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    invalidateNotificationsQueryCache: (...args: unknown[]) => invalidateSpy(...args),
  };
});

import * as notificationsApi from '@/features/notifications/api/useNotifications';

function renderInbox() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <InboxPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('notificationMappers gating', () => {
  it('parseNotificationsListResponse maps notifications + read → isRead + workspaceId', () => {
    const result = parseNotificationsListResponse({
      notifications: [
        {
          id: 'n1',
          title: 'Hello',
          body: 'World',
          priority: 'normal',
          read: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          workspaceId: WS,
          data: { taskId: TASK, projectId: PROJECT },
        },
      ],
      nextCursor: 'cursor-1',
      hasMore: true,
    });

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].isRead).toBe(true);
    expect(result.notifications[0].workspaceId).toBe(WS);
    expect(result.nextCursor).toBe('cursor-1');
    expect(result.hasMore).toBe(true);
  });

  it('buildTaskDeepLink requires workspaceId, projectId, and taskId', () => {
    expect(
      buildTaskDeepLink({
        workspaceId: WS,
        data: { projectId: PROJECT, taskId: TASK },
      }),
    ).toBe(`/workspaces/${WS}/projects/${PROJECT}?task=${TASK}`);

    expect(
      buildTaskDeepLink({
        workspaceId: undefined,
        data: { projectId: PROJECT, taskId: TASK },
      }),
    ).toBeNull();
  });

  it('mapNotificationItem maps read field to isRead', () => {
    const item = mapNotificationItem({
      id: 'x',
      title: 't',
      priority: 'normal',
      read: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      workspaceId: WS,
    });
    expect(item.isRead).toBe(false);
    expect(item.workspaceId).toBe(WS);
  });
});

describe('InboxPage PR-2 gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestPatch.mockResolvedValue({ updated: 1 });
    requestPost.mockResolvedValue({ success: true });
    requestGet.mockImplementation(async (url: string) => {
      if (url.includes('status=dismissed')) {
        return { notifications: [], nextCursor: null };
      }
      if (url.includes('status=unread')) {
        return { notifications: [], nextCursor: null };
      }
      return { notifications: [ACTIVE_ROW], nextCursor: null };
    });
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

  it('per-row dismiss calls PATCH inbox-state dismissed:true and removes row', async () => {
    const user = userEvent.setup();
    renderInbox();

    await waitFor(() => {
      expect(screen.getByTestId(`inbox-notification-row-${ACTIVE_ROW.id}`)).toBeInTheDocument();
    });

    await user.click(screen.getByTestId(`inbox-row-dismiss-${ACTIVE_ROW.id}`));

    await waitFor(() => {
      expect(requestPatch).toHaveBeenCalledWith('/notifications/inbox-state', {
        notificationIds: [ACTIVE_ROW.id],
        dismissed: true,
      });
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(`inbox-notification-row-${ACTIVE_ROW.id}`),
      ).not.toBeInTheDocument();
    });

    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('bulk dismiss requires confirmation before PATCH', async () => {
    const user = userEvent.setup();
    renderInbox();

    await waitFor(() => {
      expect(screen.getByTestId(`inbox-row-check-${ACTIVE_ROW.id}`)).toBeInTheDocument();
    });

    await user.click(screen.getByTestId(`inbox-row-check-${ACTIVE_ROW.id}`));
    await user.click(screen.getByTestId('inbox-bulk-dismiss'));

    const dialog = await screen.findByTestId('inbox-bulk-dismiss-dialog');
    expect(within(dialog).getByText(/Dismiss 1 notification\?/i)).toBeInTheDocument();
    expect(requestPatch).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('inbox-bulk-dismiss-confirm'));

    await waitFor(() => {
      expect(requestPatch).toHaveBeenCalledWith('/notifications/inbox-state', {
        notificationIds: [ACTIVE_ROW.id],
        dismissed: true,
      });
    });
  });

  it('restore on dismissed tab calls PATCH dismissed:false', async () => {
    const user = userEvent.setup();
    requestGet.mockImplementation(async (url: string) => {
      if (url.includes('status=dismissed')) {
        return { notifications: [DISMISSED_ROW], nextCursor: null };
      }
      return { notifications: [], nextCursor: null };
    });

    renderInbox();
    const user2 = userEvent.setup();
    await user2.click(screen.getByTestId('inbox-filter-trigger'));
    await user2.click(screen.getByTestId('inbox-filter-dismissed'));

    await waitFor(() => {
      expect(screen.getByTestId(`inbox-notification-row-${DISMISSED_ROW.id}`)).toBeInTheDocument();
    });

    await user.click(screen.getByTestId(`inbox-row-restore-${DISMISSED_ROW.id}`));

    await waitFor(() => {
      expect(requestPatch).toHaveBeenCalledWith('/notifications/inbox-state', {
        notificationIds: [DISMISSED_ROW.id],
        dismissed: false,
      });
    });
  });

  it('empty all tab with dismissed probe shows caught-up variant with link', async () => {
    const user = userEvent.setup();
    requestGet.mockImplementation(async (url: string) => {
      if (url.includes('status=dismissed')) {
        return { notifications: [DISMISSED_ROW], nextCursor: null };
      }
      return { notifications: [], nextCursor: null };
    });

    renderInbox();

    await waitFor(() => {
      expect(screen.getByTestId('inbox-empty-state')).toBeInTheDocument();
    });

    expect(screen.getByText(/You're all caught up/i)).toBeInTheDocument();
    await user.click(screen.getByTestId('inbox-view-dismissed-link'));

    await waitFor(() => {
      expect(requestGet).toHaveBeenCalledWith(
        expect.stringContaining('status=dismissed'),
      );
    });
  });

  it('Open task button is disabled when deep-link ids are missing', async () => {
    requestGet.mockResolvedValue({
      notifications: [
        {
          ...ACTIVE_ROW,
          workspaceId: undefined,
          data: {},
        },
      ],
      nextCursor: null,
    });

    renderInbox();

    await waitFor(() => {
      expect(screen.getByTestId(`inbox-notification-row-${ACTIVE_ROW.id}`)).toBeInTheDocument();
    });

    await userEvent.setup().click(screen.getByTestId(`inbox-notification-row-${ACTIVE_ROW.id}`));

    const btn = await screen.findByTestId('inbox-open-task-btn');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringContaining('missing'));
  });
});

describe('NotificationBell contract gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.useNotifications).mockReturnValue({
      data: parseNotificationsListResponse({
        notifications: [
          {
            id: 'bell-1',
            title: 'Moved task',
            body: 'In project',
            priority: 'normal',
            read: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            workspaceId: WS,
            data: { taskId: TASK, projectId: PROJECT },
          },
        ],
        nextCursor: null,
      }),
      isLoading: false,
    } as ReturnType<typeof notificationsApi.useNotifications>);
  });

  it('renders notifications from data.notifications with isRead mapping', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <NotificationBell />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.click(screen.getByTestId('notification-bell'));

    await waitFor(() => {
      expect(screen.getByText('Moved task')).toBeInTheDocument();
    });
    expect(screen.getByText('In project')).toBeInTheDocument();
  });
});
