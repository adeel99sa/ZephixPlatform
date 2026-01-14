/**
 * PROMPT 7 D2: Frontend Tests for JoinWorkspacePage
 *
 * Tests:
 * - Join page shows sign in screen when not authenticated
 * - Join page calls join when authenticated and navigates to /workspaces/:id
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { JoinWorkspacePage } from '../JoinWorkspacePage';
import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { joinWorkspace } from '@/features/workspaces/api/workspace-invite.api';

// Mock dependencies
vi.mock('@/state/AuthContext');
vi.mock('@/state/workspace.store');
vi.mock('@/features/workspaces/api/workspace-invite.api');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [
      new URLSearchParams('?token=test-token-123'),
    ],
    useNavigate: () => vi.fn(),
  };
});

describe('JoinWorkspacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sign in screen when not authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as any);

    render(
      <BrowserRouter>
        <JoinWorkspacePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Join workspace')).toBeInTheDocument();
      expect(screen.getByText('Sign in to join this workspace')).toBeInTheDocument();
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });
  });

  it('calls join when authenticated and navigates to /workspaces/:id', async () => {
    const mockNavigate = vi.fn();
    const mockSetActiveWorkspace = vi.fn();

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'user@test.com', role: 'member' },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as any);

    vi.mocked(useWorkspaceStore).mockReturnValue({
      setActiveWorkspace: mockSetActiveWorkspace,
    } as any);

    vi.mocked(joinWorkspace).mockResolvedValue({ workspaceId: 'ws-123' });

    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useSearchParams: () => [
          new URLSearchParams('?token=test-token-123'),
        ],
        useNavigate: () => mockNavigate,
      };
    });

    render(
      <BrowserRouter>
        <JoinWorkspacePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(joinWorkspace).toHaveBeenCalledWith('test-token-123');
    });

    await waitFor(() => {
      expect(mockSetActiveWorkspace).toHaveBeenCalledWith('ws-123');
      expect(mockNavigate).toHaveBeenCalledWith('/workspaces/ws-123');
    });
  });
});
