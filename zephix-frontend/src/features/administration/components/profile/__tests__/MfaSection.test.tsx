import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MfaSection } from '../MfaSection';
import * as authApi from '@/lib/auth/auth.api';
import * as AuthContext from '@/state/AuthContext';

vi.mock('@/lib/auth/auth.api', () => ({
  enrollMfa: vi.fn(),
  verifyMfaEnrollment: vi.fn(),
  disableMfa: vi.fn(),
}));

vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('MfaSection', () => {
  const refreshMe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      refreshMe,
    } as ReturnType<typeof AuthContext.useAuth>);
  });

  it('start enrollment shows QR and manual key with copy control', async () => {
    vi.mocked(authApi.enrollMfa).mockResolvedValue({
      secret: 'SECRETBASE32',
      qrCodeDataUrl: 'data:image/png;base64,xx',
      manualEntryKey: 'SECRETBASE32',
    });

    const user = userEvent.setup();
    render(<MfaSection user={{ platformRole: 'ADMIN', mfaEnrolled: false }} />);

    await user.click(screen.getByRole('button', { name: /start mfa enrollment/i }));

    expect(await screen.findByRole('img', { name: /qr code for mfa setup/i })).toHaveAttribute(
      'src',
      'data:image/png;base64,xx',
    );
    expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument();
  });

  it('verify calls API and refreshMe', async () => {
    vi.mocked(authApi.enrollMfa).mockResolvedValue({
      secret: 'ABCD',
      qrCodeDataUrl: 'data:image/png;base64,xx',
      manualEntryKey: 'ABCD',
    });
    vi.mocked(authApi.verifyMfaEnrollment).mockResolvedValue({ mfa_enabled: true });

    const user = userEvent.setup();
    render(<MfaSection user={{ platformRole: 'ADMIN', mfaEnrolled: false }} />);

    await user.click(screen.getByRole('button', { name: /start mfa enrollment/i }));
    await user.type(screen.getByLabelText(/verification code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify and enable/i }));

    expect(authApi.verifyMfaEnrollment).toHaveBeenCalledWith('123456');
    expect(refreshMe).toHaveBeenCalled();
  });

  it('disable MFA sends currentPassword', async () => {
    vi.mocked(authApi.disableMfa).mockResolvedValue({ mfa_enabled: false });

    const user = userEvent.setup();
    render(<MfaSection user={{ platformRole: 'MEMBER', mfaEnrolled: true }} />);

    await user.type(screen.getByLabelText(/confirm password to disable mfa/i), 'secret-pass');
    await user.click(screen.getByRole('button', { name: /disable mfa/i }));

    expect(authApi.disableMfa).toHaveBeenCalledWith({ currentPassword: 'secret-pass' });
    expect(refreshMe).toHaveBeenCalled();
  });
});
