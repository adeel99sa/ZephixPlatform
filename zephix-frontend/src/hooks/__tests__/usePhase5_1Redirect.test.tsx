import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePhase5_1Redirect } from '../usePhase5_1Redirect';
import { api } from '@/lib/api';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: '/templates',
    search: '?legacy=true&workspaceId=ws-1',
    hash: '',
    state: null,
    key: 'default',
  }),
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: () => ({ activeWorkspaceId: 'ws-1' }),
}));

vi.mock('@/state/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('../useWorkspaceRole', () => ({
  useWorkspaceRole: () => ({ role: 'ADMIN', canWrite: true }),
}));

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}));

describe('usePhase5_1Redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not redirect to workspace dashboard when on /templates (Template Center)', async () => {
    renderHook(() => usePhase5_1Redirect());

    await waitFor(() => {
      expect(api.get).not.toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
