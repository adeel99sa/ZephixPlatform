import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { InviteAcceptPage } from '../InviteAcceptPage';
import * as invitationsApi from '@/features/auth/invitations.api';
import * as AuthContext from '@/state/AuthContext';

vi.mock('@/features/auth/invitations.api', () => ({
  previewInvitation: vi.fn(),
  acceptInvitation: vi.fn(),
}));

vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function renderAccept(token: string | null) {
  const search = token ? `?token=${encodeURIComponent(token)}` : '';
  return render(
    <MemoryRouter initialEntries={[`/invites/accept${search}`]}>
      <Routes>
        <Route path="/invites/accept" element={<InviteAcceptPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InviteAcceptPage', () => {
  const bootstrapSessionFromTokens = vi.fn();
  const refreshMe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      loading: false,
      bootstrapSessionFromTokens,
      refreshMe,
      login: vi.fn(),
      logout: vi.fn(),
      completeMfaLogin: vi.fn(),
      isLoading: false,
      isAuthenticated: false,
    } as ReturnType<typeof AuthContext.useAuth>);
    vi.mocked(invitationsApi.previewInvitation).mockResolvedValue({
      email: 'inv@example.com',
      orgName: 'Acme Org',
      invitedRole: 'MEMBER',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
  });

  it('shows error when token is missing', async () => {
    renderAccept(null);
    expect(await screen.findByText(/invitation token is missing/i)).toBeInTheDocument();
  });

  it('renders preview and new-user form when not logged in', async () => {
    renderAccept('tok-1');
    expect(await screen.findByText(/acme org/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('accepts invitation as new user with 201 + bootstrap', async () => {
    vi.mocked(invitationsApi.acceptInvitation).mockResolvedValue({
      status: 201,
      data: {
        user: {},
        accessToken: 'a',
        refreshToken: 'r',
      },
    });
    const user = userEvent.setup();
    renderAccept('tok-1');

    await screen.findByText(/acme org/i);
    await user.type(screen.getByLabelText(/full name/i), 'Pat Example');
    await user.type(screen.getByLabelText(/^password$/i), 'password12');
    await user.click(screen.getByRole('button', { name: /accept and create account/i }));

    await waitFor(() => {
      expect(bootstrapSessionFromTokens).toHaveBeenCalledWith('a', 'r');
    });
  });

  it('maps preview errors via getApiErrorMessage', async () => {
    vi.mocked(invitationsApi.previewInvitation).mockRejectedValue({
      response: { status: 410, data: { code: 'INVITATION_EXPIRED', message: 'gone' } },
    });
    renderAccept('bad');
    expect(await screen.findByText(/expired/i)).toBeInTheDocument();
  });
});
