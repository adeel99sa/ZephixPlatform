import { type ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { ProfileThemeToggle } from '@/components/shell/ProfileThemeToggle';
import { UserProfileDropdown } from '@/components/shell/UserProfileDropdown';
import { useUIStore } from '@/stores/uiStore';

vi.mock('@/lib/api', () => ({
  request: {
    patch: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(() => ({ clearActiveWorkspace: vi.fn(), workspaceRole: null })),
}));

vi.mock('@/stores/organizationStore', () => ({
  useOrganizationStore: vi.fn(() => ({
    getUserOrganizations: vi.fn(),
    organizations: [],
  })),
}));

vi.mock('@/lib/telemetry', () => ({
  track: vi.fn(),
}));

import { request } from '@/lib/api';
import { useAuth } from '@/state/AuthContext';

const MEMBER_USER = {
  id: '2',
  platformRole: 'MEMBER',
  email: 'member@test.com',
  firstName: 'Team',
  lastName: 'Member',
};

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('P-A1 Theme UX gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
    useUIStore.setState({ theme: 'light' });
    useUIStore.getState().setTheme('light');
    vi.mocked(useAuth).mockReturnValue({ user: MEMBER_USER, logout: vi.fn() });
    vi.mocked(request.patch).mockResolvedValue({ theme: 'dark' });
  });

  it('profile menu exposes Light / Dark / Auto theme toggle', async () => {
    const user = userEvent.setup();
    renderWithClient(<UserProfileDropdown align="right" />);

    await user.click(screen.getByTestId('user-profile-button'));

    expect(screen.getByTestId('profile-theme-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('profile-theme-light')).toBeInTheDocument();
    expect(screen.getByTestId('profile-theme-dark')).toBeInTheDocument();
    expect(screen.getByTestId('profile-theme-auto')).toBeInTheDocument();
  });

  it('selecting Dark persists via PATCH /users/me/preferences', async () => {
    const user = userEvent.setup();
    renderWithClient(<ProfileThemeToggle />);

    await user.click(screen.getByTestId('profile-theme-dark'));

    await waitFor(() => {
      expect(request.patch).toHaveBeenCalledWith('/users/me/preferences', { theme: 'dark' });
    });
    expect(useUIStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('selecting Auto persists system theme preference', async () => {
    const user = userEvent.setup();
    vi.mocked(request.patch).mockResolvedValue({ theme: 'system' });
    renderWithClient(<ProfileThemeToggle />);

    await user.click(screen.getByTestId('profile-theme-auto'));

    await waitFor(() => {
      expect(request.patch).toHaveBeenCalledWith('/users/me/preferences', { theme: 'system' });
    });
    expect(useUIStore.getState().theme).toBe('system');
  });
});
