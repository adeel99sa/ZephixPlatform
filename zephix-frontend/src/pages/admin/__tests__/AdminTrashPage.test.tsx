/**
 * AdminTrashPage — GET /admin/trash may return an array or { data } after client unwrap.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdminTrashPage from '../AdminTrashPage';
import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/features/dashboards/api', () => ({
  restoreDashboard: vi.fn(),
}));

vi.mock('@/features/projects/api', () => ({
  restoreProject: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/lib/telemetry', () => ({
  track: vi.fn(),
}));

describe('AdminTrashPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists items returned from GET /admin/trash (unwrapped array)', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === '/admin/trash/retention-policy') {
        return { defaultRetentionDays: 30 };
      }
      if (url === '/admin/trash') {
        return [
          {
            id: 'ws-1',
            name: 'Deleted Workspace',
            type: 'workspace' as const,
            deletedAt: '2026-04-01T12:00:00.000Z',
          },
        ];
      }
      return null;
    });

    render(<AdminTrashPage />);

    await waitFor(() => {
      expect(screen.getByText('Deleted Workspace')).toBeInTheDocument();
    });
    expect(apiClient.get).toHaveBeenCalledWith('/admin/trash', {
      params: { type: 'all' },
    });
  });
});
