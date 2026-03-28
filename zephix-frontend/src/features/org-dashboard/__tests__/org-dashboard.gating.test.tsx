/**
 * Phase 4A: OrgDashboardPage Gating Tests
 *
 * Verifies: ADMIN can render, MEMBER redirected, VIEWER redirected, unauth to /login.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OrgDashboardPage from '../OrgDashboardPage';

// Mock auth context
const mockUseAuth = vi.fn();
vi.mock('@/state/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock access helper — controls admin gating
const mockIsPlatformAdmin = vi.fn();
vi.mock('@/utils/access', () => ({
  isPlatformAdmin: (user: any) => mockIsPlatformAdmin(user),
}));

// Mock API (don't actually call backend)
vi.mock('../orgDashboard.api', () => ({
  orgDashboardApi: {
    getOrgAnalyticsSummary: vi.fn().mockResolvedValue({
      workspaceCount: 3, portfolioCount: 1, projectCount: 10,
      atRiskProjectsCount: 2, evEligibleProjectsCount: 5,
      aggregateCPI: 0.95, aggregateSPI: 1.02,
      totalBudget: 100000, totalActualCost: 80000,
      planCode: 'enterprise', planStatus: 'active',
      timestamp: new Date().toISOString(),
    }),
    getOrgAnalyticsStorage: vi.fn().mockResolvedValue({
      totalUsedBytes: 500000, totalReservedBytes: 1000,
      maxStorageBytes: 1000000, percentUsed: 50,
      storageByWorkspace: [], topWorkspacesByStorage: [],
      timestamp: new Date().toISOString(),
    }),
    getOrgAnalyticsCapacity: vi.fn().mockResolvedValue({
      utilizationByWorkspace: [], topOverallocatedUsers: [],
      overallocationDaysTotal: 0, timestamp: new Date().toISOString(),
    }),
  },
}));

function renderWithRouter(initialEntries = ['/org-dashboard']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/org-dashboard" element={<OrgDashboardPage />} />
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route path="/home" element={<div data-testid="home-page">Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrgDashboardPage gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ADMIN can access the page (isPlatformAdmin returns true)', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', platformRole: 'ADMIN', organizationId: 'org-1' },
      loading: false,
    });
    mockIsPlatformAdmin.mockReturnValue(true);
    renderWithRouter();
    const dashboard = screen.queryByTestId('org-dashboard') || screen.queryByTestId('org-dashboard-loading');
    expect(dashboard).not.toBeNull();
    expect(mockIsPlatformAdmin).toHaveBeenCalled();
  });

  it('MEMBER is redirected to /home (isPlatformAdmin returns false)', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u2', platformRole: 'MEMBER', organizationId: 'org-1' },
      loading: false,
    });
    mockIsPlatformAdmin.mockReturnValue(false);
    renderWithRouter();
    expect(screen.getByTestId('home-page')).toBeDefined();
  });

  it('VIEWER is redirected to /home (isPlatformAdmin returns false)', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u3', platformRole: 'VIEWER', organizationId: 'org-1' },
      loading: false,
    });
    mockIsPlatformAdmin.mockReturnValue(false);
    renderWithRouter();
    expect(screen.getByTestId('home-page')).toBeDefined();
  });

  it('unauthenticated user is redirected to /login', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });
    renderWithRouter();
    expect(screen.getByTestId('login-page')).toBeDefined();
  });

  it('shows nothing while auth is loading (no flash)', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });
    const { container } = renderWithRouter();
    expect(container.innerHTML).toBe('');
  });

  it('delegates admin check to isPlatformAdmin helper', async () => {
    const user = { id: 'u4', platformRole: 'admin', role: 'admin', organizationId: 'org-1' };
    mockUseAuth.mockReturnValue({ user, loading: false });
    mockIsPlatformAdmin.mockReturnValue(true);
    renderWithRouter();
    // isPlatformAdmin must be called with the user object
    expect(mockIsPlatformAdmin).toHaveBeenCalledWith(user);
    const dashboard = screen.queryByTestId('org-dashboard') || screen.queryByTestId('org-dashboard-loading');
    expect(dashboard).not.toBeNull();
  });
});
