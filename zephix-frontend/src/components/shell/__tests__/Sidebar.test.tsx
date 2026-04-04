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

import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useProjects } from '@/features/projects/hooks';

const mockUseProjects = useProjects as ReturnType<typeof vi.fn>;

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseWorkspaceStore = useWorkspaceStore as ReturnType<typeof vi.fn>;

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
    // Default: no projects
    mockUseProjects.mockReturnValue({ data: [], isLoading: false });
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

    it('My Tasks child items are visible as non-click explanatory text', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.getByText('Assigned to Me')).toBeInTheDocument();
      expect(screen.getByText('Today and Overdue')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });

    it('My Tasks child items are not clickable buttons or links', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      const container = screen.getByTestId('my-tasks-children');
      // No buttons or anchor tags inside the children
      expect(container.querySelectorAll('button')).toHaveLength(0);
      expect(container.querySelectorAll('a')).toHaveLength(0);
    });

    it('My Tasks child items are styled as italic explanatory text', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      const assignedItem = screen.getByText('Assigned to Me');
      expect(assignedItem.className).toContain('italic');
      expect(assignedItem.className).toContain('text-slate-400');
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

    it('shows empty state when no workspace selected', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.getByText('No workspaces yet.')).toBeInTheDocument();
    });

    it('shows Create Workspace button in empty state for admin', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.getByTestId('empty-create-workspace')).toBeInTheDocument();
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

  describe('Nested Dashboards and Shared under Workspaces', () => {
    it('Dashboards section appears when workspace is selected', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: 'ws-1', setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.getByTestId('section-dashboards')).toBeInTheDocument();
    });

    it('Dashboards plus is always visible when workspace selected', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: 'ws-1', setActiveWorkspace: vi.fn() });
      renderSidebar();

      const plus = screen.getByTestId('section-dashboards-plus');
      expect(plus).toBeInTheDocument();
      // plusAlwaysVisible means opacity-100 (not hidden behind hover)
      expect(plus.className).toContain('opacity-100');
    });

    it('Shared section appears when workspace is selected', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: 'ws-1', setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.getByTestId('section-shared')).toBeInTheDocument();
    });

    it('Dashboards and Shared do NOT appear without workspace', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByTestId('section-dashboards')).not.toBeInTheDocument();
      expect(screen.queryByTestId('section-shared')).not.toBeInTheDocument();
    });
  });

  describe('Favorites (Pass 1.1: no management controls)', () => {
    it('Favorites section is visible', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.getByTestId('section-favorites')).toBeInTheDocument();
    });

    it('Favorites shows honest empty state', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.getByText('No favorites yet.')).toBeInTheDocument();
    });

    it('Favorites plus is NOT present (deferred to Pass 2)', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByTestId('section-favorites-plus')).not.toBeInTheDocument();
    });

    it('Favorites three-dot is NOT present (deferred to Pass 2)', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: null, setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByTestId('section-favorites-more')).not.toBeInTheDocument();
    });
  });

  describe('Shared (Pass 1.1: no management controls)', () => {
    it('Shared three-dot is NOT present (deferred to Pass 2)', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: 'ws-1', setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByTestId('section-shared-more')).not.toBeInTheDocument();
    });
  });

  describe('Dashboards (Pass 1.1: three-dot removed)', () => {
    it('Dashboards three-dot is NOT present', () => {
      mockUseAuth.mockReturnValue({ user: ADMIN_USER });
      mockUseWorkspaceStore.mockReturnValue({ activeWorkspaceId: 'ws-1', setActiveWorkspace: vi.fn() });
      renderSidebar();

      expect(screen.queryByTestId('section-dashboards-more')).not.toBeInTheDocument();
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
