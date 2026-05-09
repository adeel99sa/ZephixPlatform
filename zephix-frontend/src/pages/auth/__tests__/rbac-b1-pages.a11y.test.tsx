/**
 * Accessibility checks (jest-axe) for RBAC Build 1 surfaces.
 * Complements Lighthouse mobile runs (see scripts/rbac-b1-lighthouse-a11y-mobile.sh).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ForgotPasswordPage from '../ForgotPasswordPage';
import ResetPasswordPage from '../ResetPasswordPage';
import LoginPage from '../LoginPage';
import { Forbidden } from '@/pages/system/Forbidden';
import * as AuthContext from '@/state/AuthContext';

expect.extend(toHaveNoViolations);

vi.mock('@/state/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('@/state/AuthContext')>('@/state/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe('RBAC B1 — jest-axe (no serious a11y violations)', () => {
  beforeEach(() => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      loading: false,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshMe: vi.fn(),
      completeMfaLogin: vi.fn(),
      bootstrapSessionFromTokens: vi.fn(),
    } as ReturnType<typeof AuthContext.useAuth>);
  });

  it('ForgotPasswordPage', async () => {
    const { container } = render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ResetPasswordPage', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/reset-password?token=t']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('LoginPage', async () => {
    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Forbidden need_org_admin', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/403?reason=need_org_admin']}>
        <Routes>
          <Route path="/403" element={<Forbidden />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Forbidden need_workspace_owner', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/403?reason=need_workspace_owner']}>
        <Routes>
          <Route path="/403" element={<Forbidden />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
