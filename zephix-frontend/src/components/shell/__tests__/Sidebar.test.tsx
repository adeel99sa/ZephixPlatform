/**
 * Pass 1 — Shell behavior tests (locked UX contract)
 *
 * Validates:
 * 1. Logo routes to Inbox
 * 2. Inbox nav item is present
 * 3. Administration Console is NOT in the left panel
 * 4. My Tasks chevron is visible
 * 5. Workspaces plus is visible (admin)
 * 6. Nested Dashboards plus is visible under Workspaces (when workspace selected)
 * 7. No dead-click controls
 * 8. Sidebar structure matches locked spec
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';

vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('@/stores/uiStore', () => ({
  useUIStore: vi.fn(() => ({ addToast: vi.fn() })),
}));

vi.mock('@/lib/telemetry', () => ({
  track: vi.fn(),
}));

vi.mock('@/hooks/useUnreadNotifications', () => ({
  useUnreadNotifications: vi.fn(() => ({ unreadCount: 0 })),
}));

vi.mock('@/features/workspaces/SidebarWorkspaces', () => ({
  SidebarWorkspaces: () => <div data-testid="sidebar-workspaces" />,
}));

vi.mock('@/features/workspaces/WorkspaceCreateModal', () => ({
  WorkspaceCreateModal: () => null,
}));

vi.mock('@/features/projects/hooks', () => ({
  useProjects: vi.fn(),
}));

vi.mock('@/features/favorites/hooks', () => ({
  useFavorites: vi.fn(),
  useRemoveFavorite: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('@/features/dashboards/api', () => ({
  listPublishedDashboards: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/features/organizations/useOrgHomeState', () => ({
  useOrgHomeState: vi.fn(() => ({ workspaceCount: 0, isLoading: false })),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: [], isLoading: false })),
  };
});

import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useProjects } from '@/features/projects/hooks';
import { useFavorites } from '@/features/favorites/hooks';
import { useOrgHomeState } from '@/features/organizations/useOrgHomeState';

const mockUseProjects = useProjects as ReturnType<typeof vi.fn>;
const mockUseFavorites = useFavorites as ReturnType<typeof vi.fn>;

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseWorkspaceStore = useWorkspaceStore as ReturnType<typeof vi.fn>;
const mockUseOrgHomeState = useOrgHomeState as ReturnType<typeof vi.fn>;

function renderSidebar(initialPath = '/inbox') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

const ADMIN_USER = { id: '1', platformRole: 'ADMIN', role: 'admin', email: 'admin@test.com' };
const MEMBER_USER = { id: '2', platformRole: 'MEMBER', role: 'member', email: 'member@test.com' };
const VIEWER_USER = { id: '3', platformRole: 'VIEWER', role: 'viewer', email: 'viewer@test.com' };

describe('Pass 1 — Shell locked UX contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no projects, no favorites, org reports zero workspaces
    mockUseProjects.mockReturnValue({ data: [], isLoading: false });
    mockUseFavorites.mockReturnValue({ data: [], isLoading: false });
    mockUseOrgHomeState.mockReturnValue({ workspaceCount: 0, isLoading: false });
  });

  describe('Logo and Inbox', () => {
    it('logo links to /inbox', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      const brand = screen.getByTestId('platform-brand');
      expect(brand).toBeInTheDocument();
      expect(brand.getAttribute('href')).toBe('/inbox');
    });

    it('Inbox nav item is present and links to /inbox', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      const inboxLink = screen.getByTestId('nav-inbox');
      expect(inboxLink).toBeInTheDocument();
      expect(inboxLink.getAttribute('href')).toBe('/inbox');
    });

    it('Inbox is visible for all roles (admin, member, viewer)', () => {
      for (const user of [ADMIN_USER, MEMBER_USER, VIEWER_USER]) {
        mockUseAuth.mockReturnValue({ user });
        mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
        const { unmount } = renderSidebar();
        expect(screen.getByTestId('nav-inbox')).toBeInTheDocument();
        unmount();
      }
    });
  });

  describe('Administration Console is NOT in left panel', () => {
    it('admin does not see Administration in sidebar', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByText('Administration')).not.toBeInTheDocument();
      expect(screen.queryByText('Administration Console')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-administration')).not.toBeInTheDocument();
    });

    it('member does not see Administration in sidebar', () => {
      mockUseAuth.mockReturnValue({ user: MEMBER_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByText('Administration')).not.toBeInTheDocument();
    });
  });

  describe('My Tasks', () => {
    it('My Tasks chevron is visible', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.getByTestId('section-my-tasks-chevron')).toBeInTheDocument();
    });

    it('My Tasks shows real destinations for paid users (Admin and Member)', () => {
      for (const user of [ADMIN_USER, MEMBER_USER]) {
        mockUseAuth.mockReturnValue({ user });
        mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
        const { unmount } = renderSidebar();

        expect(screen.getByTestId('my-tasks-assigned').getAttribute('href')).toBe('/my-work');
        expect(screen.getByTestId('my-tasks-urgent').getAttribute('href')).toBe(
          '/my-work?filter=urgent',
        );
        unmount();
      }
    });

    it('My Tasks Personal is not a link and explains future availability', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.getByTestId('my-tasks-personal-static')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^Personal$/i })).not.toBeInTheDocument();
    });

    it('My Tasks uses static rows for guest (Viewer) instead of links', () => {
      mockUseAuth.mockReturnValue({ user: VIEWER_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.getByTestId('my-tasks-assigned-static')).toBeInTheDocument();
      expect(screen.getByTestId('my-tasks-urgent-static')).toBeInTheDocument();
      const container = screen.getByTestId('my-tasks-children');
      expect(container.querySelectorAll('a')).toHaveLength(0);
    });
  });

  describe('Workspaces section', () => {
    it('Workspaces plus is visible for admin', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.getByTestId('section-workspaces-plus')).toBeInTheDocument();
    });

    it('Workspaces plus is NOT visible for member', () => {
      mockUseAuth.mockReturnValue({ user: MEMBER_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByTestId('section-workspaces-plus')).not.toBeInTheDocument();
    });

    it('shows first-workspace empty state when org has no workspaces', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      mockUseOrgHomeState.mockReturnValue({ workspaceCount: 0, isLoading: false });
      renderSidebar();

      expect(screen.getByTestId('workspaces-empty-first')).toBeInTheDocument();
      expect(screen.getByText(/Create your first workspace/i)).toBeInTheDocument();
    });

    it('shows choose-workspace prompt when org has workspaces but none selected', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      mockUseOrgHomeState.mockReturnValue({ workspaceCount: 2, isLoading: false });
      renderSidebar();

      expect(screen.getByTestId('workspaces-select-prompt')).toBeInTheDocument();
      expect(screen.getByText(/Choose a workspace/i)).toBeInTheDocument();
      expect(screen.queryByTestId('empty-create-workspace')).not.toBeInTheDocument();
    });

    it('shows loading line while org workspace count is loading', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      mockUseOrgHomeState.mockReturnValue({ workspaceCount: 0, isLoading: true });
      renderSidebar();

      expect(screen.getByTestId('workspaces-empty-loading')).toBeInTheDocument();
    });

    it('shows Create Workspace button in first-workspace empty state for admin', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      mockUseOrgHomeState.mockReturnValue({ workspaceCount: 0, isLoading: false });
      renderSidebar();

      expect(screen.getByTestId('empty-create-workspace')).toBeInTheDocument();
    });

    it('member with no workspaces sees admin note, not Create Workspace', () => {
      mockUseAuth.mockReturnValue({ user: MEMBER_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      mockUseOrgHomeState.mockReturnValue({ workspaceCount: 0, isLoading: false });
      renderSidebar();

      expect(screen.getByText(/Ask an organization admin/i)).toBeInTheDocument();
      expect(screen.queryByTestId('empty-create-workspace')).not.toBeInTheDocument();
    });

    it('Workspaces section plus opens anchored menu before modal', async () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      await userEvent.click(screen.getByTestId('section-workspaces-plus'));
      expect(screen.getByTestId('section-workspaces-plus-menu')).toBeInTheDocument();
      expect(screen.getByTestId('section-workspaces-plus-create')).toBeInTheDocument();
    });

    it('Workspaces section three-dot opens anchored menu with Browse and Manage for admin', async () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      await userEvent.click(screen.getByTestId('section-workspaces-more'));
      expect(screen.getByTestId('section-workspaces-more-menu')).toBeInTheDocument();
      expect(screen.getByTestId('section-workspaces-browse')).toBeInTheDocument();
      expect(screen.getByTestId('section-workspaces-manage')).toBeInTheDocument();
    });

    it('Workspaces section three-dot shows only Browse for member', async () => {
      mockUseAuth.mockReturnValue({ user: MEMBER_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      await userEvent.click(screen.getByTestId('section-workspaces-more'));
      expect(screen.getByTestId('section-workspaces-browse')).toBeInTheDocument();
      expect(screen.queryByTestId('section-workspaces-manage')).not.toBeInTheDocument();
    });
  });

  describe('Projects visibility (Pass 1.2)', () => {
    it('Projects is NOT shown when no workspace exists', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      mockUseProjects.mockReturnValue({ data: [], isLoading: false });
      renderSidebar();

      expect(screen.queryByTestId('ws-nav-projects')).not.toBeInTheDocument();
    });

    it('Projects is NOT shown when workspace exists but no project exists', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: 'ws-1', setActiveWorkspace: vi.fn() });
      mockUseProjects.mockReturnValue({ data: [], isLoading: false });
      renderSidebar();

      expect(screen.queryByTestId('ws-nav-projects')).not.toBeInTheDocument();
    });

    it('Projects IS shown when workspace exists and real project exists', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: 'ws-1', setActiveWorkspace: vi.fn() });
      mockUseProjects.mockReturnValue({
        data: [{ id: 'proj-1', name: 'My Project', projectState: 'ACTIVE' }],
        isLoading: false,
      });
      renderSidebar();

      expect(screen.getByTestId('ws-nav-projects')).toBeInTheDocument();
    });

    it('Projects is NOT shown while projects are still loading', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: 'ws-1', setActiveWorkspace: vi.fn() });
      mockUseProjects.mockReturnValue({ data: undefined, isLoading: true });
      renderSidebar();

      expect(screen.queryByTestId('ws-nav-projects')).not.toBeInTheDocument();
    });
  });

  describe('Dashboards (top-level, IA correction)', () => {
    it('Dashboards is a top-level section for Admin (always visible)', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.getByTestId('section-dashboards')).toBeInTheDocument();
    });

    it('Dashboards is visible for Admin even without workspace selected', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.getByTestId('section-dashboards')).toBeInTheDocument();
    });

    it('Dashboards plus is always visible for Admin', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      const plus = screen.getByTestId('section-dashboards-plus');
      expect(plus).toBeInTheDocument();
      expect(plus.className).toContain('opacity-100');
    });

    it('Dashboards is NOT visible for non-admin (Member)', () => {
      mockUseAuth.mockReturnValue({ user: MEMBER_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByTestId('section-dashboards')).not.toBeInTheDocument();
    });

    it('Dashboards visible without workspace proves it is not nested under Workspaces', () => {
      // If Dashboards were nested under Workspaces, it would only appear when
      // activeWorkspaceId is set. The "visible without workspace" test above
      // already proves Dashboards is a top-level independent section.
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.getByTestId('section-dashboards')).toBeInTheDocument();
      // Workspaces expanded content should not exist (no workspace selected)
      expect(screen.queryByTestId('ws-nav-projects')).not.toBeInTheDocument();
    });
  });

  describe('Shared (top-level, visibility-based)', () => {
    it('Shared does NOT appear when no shared items exist', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: 'ws-1', setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByTestId('section-shared')).not.toBeInTheDocument();
    });

    it('Shared does NOT appear without workspace selected', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByTestId('section-shared')).not.toBeInTheDocument();
    });
  });

  describe('Favorites (Pass 2: real data)', () => {
    it('Favorites section is visible', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.getByTestId('section-favorites')).toBeInTheDocument();
    });

    it('shows honest empty state when no favorites exist', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      mockUseFavorites.mockReturnValue({ data: [], isLoading: false });
      renderSidebar();

      expect(screen.getByTestId('favorites-empty')).toBeInTheDocument();
      expect(screen.getByText('No favorites yet.')).toBeInTheDocument();
    });

    it('shows favorited items with real display names', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      mockUseFavorites.mockReturnValue({
        data: [
          { id: 'f1', itemType: 'workspace', itemId: 'ws-1', displayName: 'Engineering Hub', displayOrder: 0, createdAt: '' },
          { id: 'f2', itemType: 'dashboard', itemId: 'dash-1', displayName: 'KPI Overview', displayOrder: 1, createdAt: '' },
        ],
        isLoading: false,
      });
      renderSidebar();

      expect(screen.getByTestId('favorites-list')).toBeInTheDocument();
      expect(screen.getByTestId('favorite-item-f1')).toBeInTheDocument();
      expect(screen.getByTestId('favorite-item-f2')).toBeInTheDocument();
      // Must show real names, not UUID fragments
      expect(screen.getByText('Engineering Hub')).toBeInTheDocument();
      expect(screen.getByText('KPI Overview')).toBeInTheDocument();
    });

    it('does not render UUID fragments for favorites', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      mockUseFavorites.mockReturnValue({
        data: [
          { id: 'f1', itemType: 'workspace', itemId: 'a1b2c3d4-5678-9abc-def0-123456789abc', displayName: 'My Workspace', displayOrder: 0, createdAt: '' },
        ],
        isLoading: false,
      });
      renderSidebar();

      // Should not show the UUID fragment
      expect(screen.queryByText(/a1b2c3d4/)).not.toBeInTheDocument();
      // Should show the real name
      expect(screen.getByText('My Workspace')).toBeInTheDocument();
    });

    it('shows remove button on hover for each favorite', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      mockUseFavorites.mockReturnValue({
        data: [{ id: 'f1', itemType: 'project', itemId: 'p-1', displayName: 'Sprint Dashboard', displayOrder: 0, createdAt: '' }],
        isLoading: false,
      });
      renderSidebar();

      expect(screen.getByTestId('favorite-remove-f1')).toBeInTheDocument();
    });
  });

  describe('No management controls on Shared or Dashboards', () => {
    it('Shared three-dot is NOT present', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: 'ws-1', setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByTestId('section-shared-more')).not.toBeInTheDocument();
    });

    it('Dashboards three-dot is NOT present', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: 'ws-1', setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByTestId('section-dashboards-more')).not.toBeInTheDocument();
    });
  });

  describe('Members removal (Pass 2)', () => {
    it('Members link is NOT in the left rail', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: 'ws-1', setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByTestId('ws-nav-members')).not.toBeInTheDocument();
      expect(screen.queryByText('Members')).not.toBeInTheDocument();
    });
  });

  describe('No dead clicks', () => {
    it('no "Coming soon" text anywhere in sidebar', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: 'ws-1', setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    });

    it('no placeholder text anywhere in sidebar', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: 'ws-1', setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();
    });
  });
});
