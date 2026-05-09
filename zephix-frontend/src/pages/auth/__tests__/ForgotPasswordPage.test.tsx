import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from '../ForgotPasswordPage';
import * as authApi from '@/lib/auth/auth.api';

vi.mock('@/lib/auth/auth.api', () => ({
  requestPasswordReset: vi.fn(),
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.requestPasswordReset).mockResolvedValue(undefined);
  });

  it('submits email and shows neutral success copy', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(authApi.requestPasswordReset).toHaveBeenCalledWith('user@example.com');
    expect(
      await screen.findByText(/if an account exists for that email/i),
    ).toBeInTheDocument();
  });

  it('shows service-unavailable message on 404/503', async () => {
    vi.mocked(authApi.requestPasswordReset).mockRejectedValue({
      response: { status: 503 },
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(
      await screen.findByText(/not available on this server yet/i),
    ).toBeInTheDocument();
  });
});
