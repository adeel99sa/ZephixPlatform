import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResetPasswordPage from '../ResetPasswordPage';
import * as authApi from '@/lib/auth/auth.api';

vi.mock('@/lib/auth/auth.api', () => ({
  resetPasswordWithToken: vi.fn(),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithToken(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/reset-password?token=${encodeURIComponent(token)}`]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.resetPasswordWithToken).mockResolvedValue(undefined);
    mockNavigate.mockClear();
  });

  it('posts token and newPassword to API', async () => {
    const user = userEvent.setup();
    renderWithToken('tok-abc');

    await user.type(screen.getByLabelText(/^new password$/i), 'password-one');
    await user.type(screen.getByLabelText(/confirm password/i), 'password-one');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(authApi.resetPasswordWithToken).toHaveBeenCalledWith({
      token: 'tok-abc',
      newPassword: 'password-one',
    });
  });

  it('maps password reset error codes via getApiErrorMessage', async () => {
    vi.mocked(authApi.resetPasswordWithToken).mockRejectedValue({
      response: {
        status: 401,
        data: { code: 'PASSWORD_RESET_TOKEN_EXPIRED', message: 'expired' },
      },
    });
    const user = userEvent.setup();
    renderWithToken('x');

    await user.type(screen.getByLabelText(/^new password$/i), 'password-one');
    await user.type(screen.getByLabelText(/confirm password/i), 'password-one');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/reset link has expired/i)).toBeInTheDocument();
  });
});
