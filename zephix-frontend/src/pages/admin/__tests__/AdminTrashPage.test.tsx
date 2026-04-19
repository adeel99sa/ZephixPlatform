/**
 * AdminTrashPage — trash list uses apiClient return value (already unwrapped).
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

  it('lists workspaces returned from GET /admin/trash (unwrapped array)', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([
      {
        id: 'ws-1',
        name: 'Deleted Workspace',
        deletedAt: '2026-04-01T12:00:00.000Z',
      },
    ]);

    render(<AdminTrashPage />);

    await waitFor(() => {
      expect(screen.getByText('Deleted Workspace')).toBeInTheDocument();
    });
    expect(apiClient.get).toHaveBeenCalledWith('/admin/trash', {
      params: { type: 'workspace' },
    });
  });
});
