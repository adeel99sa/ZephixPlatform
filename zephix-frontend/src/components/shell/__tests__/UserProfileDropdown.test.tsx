/**
 * Pass 1 — Profile menu behavior tests (locked UX contract)
 *
 * Validates:
 * 1. Profile avatar opens menu on click
 * 2. Trash and People appear for platform admins (design lock v2)
 * 3. Settings (admin console entry) appears for platform admins only
 * 4. Menu items for admin match locked spec
 * 5. Escape closes menu
 * 6. No dropdown arrow on avatar
 */
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserProfileDropdown } from '../UserProfileDropdown';

vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(() => ({ clearActiveWorkspace: vi.fn() })),
}));

vi.mock('@/stores/organizationStore', () => ({
  useOrganizationStore: vi.fn(() => ({
    currentOrganization: { name: 'TestOrg' },
    getUserOrganizations: vi.fn(),
    organizations: [{ name: 'TestOrg' }],
  })),
}));

vi.mock('@/lib/telemetry', () => ({
  track: vi.fn(),
}));

import { useAuth } from '@/state/AuthContext';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

function renderDropdown() {
  return render(
    <MemoryRouter>
      <UserProfileDropdown align="right" />
    </MemoryRouter>,
  );
}

const ADMIN_USER = {
  id: '1',
  platformRole: 'ADMIN',
  role: 'admin',
  email: 'admin@test.com',
  firstName: 'Org',
  lastName: 'Admin',
};
const MEMBER_USER = {
  id: '2',
  platformRole: 'MEMBER',
  role: 'member',
  email: 'member@test.com',
  firstName: 'Team',
  lastName: 'Member',
};

describe('Pass 1 — Profile menu locked UX contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('profile avatar button opens menu on click', async () => {
    mockUseAuth.mockReturnValue({ user: ADMIN_USER, logout: vi.fn() });
    renderDropdown();

    expect(screen.queryByTestId('user-profile-menu')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('user-profile-button'));

    expect(screen.getByTestId('user-profile-menu')).toBeInTheDocument();
  });

  it('avatar button has no dropdown arrow (ChevronDown)', () => {
    mockUseAuth.mockReturnValue({ user: ADMIN_USER, logout: vi.fn() });
    renderDropdown();

    const button = screen.getByTestId('user-profile-button');
    // Button should only contain the initial letter, no SVG chevron
    expect(button.querySelector('svg')).toBeNull();
  });

  it('admin sees all currently-real menu items', async () => {
    mockUseAuth.mockReturnValue({ user: ADMIN_USER, logout: vi.fn() });
    renderDropdown();

    await userEvent.click(screen.getByTestId('user-profile-button'));

    expect(screen.getByTestId('menu-profile')).toBeInTheDocument();
    expect(screen.getByTestId('menu-trash')).toBeInTheDocument();
    expect(screen.getByTestId('menu-people')).toBeInTheDocument();
    expect(screen.getByTestId('menu-administration')).toBeInTheDocument();
    expect(screen.getByTestId('menu-help')).toBeInTheDocument();
    expect(screen.getByTestId('menu-logout')).toBeInTheDocument();
  });

  it('Trash is linked for admins; Archive remains unused', async () => {
    mockUseAuth.mockReturnValue({ user: ADMIN_USER, logout: vi.fn() });
    renderDropdown();

    await userEvent.click(screen.getByTestId('user-profile-button'));

    expect(screen.getByTestId('menu-trash')).toBeInTheDocument();
    expect(screen.queryByTestId('menu-archive')).not.toBeInTheDocument();
  });

  it('Trash and People appear in admin profile menu', async () => {
    mockUseAuth.mockReturnValue({ user: ADMIN_USER, logout: vi.fn() });
    renderDropdown();

    await userEvent.click(screen.getByTestId('user-profile-button'));

    expect(screen.getByText('Trash')).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
  });

  it('Settings (admin console) appears in admin profile menu', async () => {
    mockUseAuth.mockReturnValue({ user: ADMIN_USER, logout: vi.fn() });
    renderDropdown();

    await userEvent.click(screen.getByTestId('user-profile-button'));

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('member does NOT see admin-only items', async () => {
    mockUseAuth.mockReturnValue({ user: MEMBER_USER, logout: vi.fn() });
    renderDropdown();

    await userEvent.click(screen.getByTestId('user-profile-button'));

    expect(screen.queryByTestId('menu-trash')).not.toBeInTheDocument();
    expect(screen.queryByTestId('menu-people')).not.toBeInTheDocument();
    expect(screen.queryByTestId('menu-trash')).not.toBeInTheDocument();
    expect(screen.queryByTestId('menu-archive')).not.toBeInTheDocument();
    expect(screen.queryByTestId('menu-administration')).not.toBeInTheDocument();
  });

  it('member sees My Profile, Help, Log out', async () => {
    mockUseAuth.mockReturnValue({ user: MEMBER_USER, logout: vi.fn() });
    renderDropdown();

    await userEvent.click(screen.getByTestId('user-profile-button'));

    expect(screen.getByTestId('menu-profile')).toBeInTheDocument();
    expect(screen.getByTestId('menu-help')).toBeInTheDocument();
    expect(screen.getByTestId('menu-logout')).toBeInTheDocument();
  });

  it('Escape closes the menu', async () => {
    mockUseAuth.mockReturnValue({ user: ADMIN_USER, logout: vi.fn() });
    renderDropdown();

    await userEvent.click(screen.getByTestId('user-profile-button'));
    expect(screen.getByTestId('user-profile-menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape', bubbles: true });
    expect(screen.queryByTestId('user-profile-menu')).not.toBeInTheDocument();
  });
});
