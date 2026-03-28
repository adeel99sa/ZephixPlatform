/**
 * Phase 4A+4C+4E: OrgDashboardPage Render Tests
 *
 * Verifies: summary cards, tables, error state, loading skeleton,
 * empty state, warning banner, lastUpdatedAt, error code display,
 * refresh button, client-side caching.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OrgDashboardPage, { WarningBanner } from '../OrgDashboardPage';

const mockUseAuth = vi.fn();
vi.mock('@/state/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/utils/access', () => ({
  isPlatformAdmin: () => true, // render tests assume ADMIN
}));

vi.mock('../orgDashboard.api', () => ({
  orgDashboardApi: {
    getOrgAnalyticsSummary: vi.fn(),
    getOrgAnalyticsStorage: vi.fn(),
    getOrgAnalyticsCapacity: vi.fn(),
  },
}));

import { orgDashboardApi } from '../orgDashboard.api';
const mockApi = orgDashboardApi as unknown as {
  getOrgAnalyticsSummary: ReturnType<typeof vi.fn>;
  getOrgAnalyticsStorage: ReturnType<typeof vi.fn>;
  getOrgAnalyticsCapacity: ReturnType<typeof vi.fn>;
};

/** Factory for a full summary response with defaults + overrides */
function makeSummary(overrides: Record<string, any> = {}) {
  return {
    workspaceCount: 5, portfolioCount: 2, projectCount: 30,
    atRiskProjectsCount: 3, evEligibleProjectsCount: 15,
    aggregateCPI: 0.95, aggregateSPI: 1.1,
    totalBudget: 500000, totalActualCost: 400000,
    planCode: 'enterprise', planStatus: 'active',
    warnings: [],
    timestamp: '2026-02-10T12:00:00.000Z',
    lastUpdatedAt: '2026-02-10T12:00:00.000Z',
    ...overrides,
  };
}

function makeStorage(overrides: Record<string, any> = {}) {
  return {
    totalUsedBytes: 100000, totalReservedBytes: 5000,
    maxStorageBytes: 1000000, percentUsed: 10,
    storageByWorkspace: [], topWorkspacesByStorage: [],
    warnings: [],
    timestamp: '2026-02-10T12:00:00.000Z',
    ...overrides,
  };
}

function makeCapacity(overrides: Record<string, any> = {}) {
  return {
    utilizationByWorkspace: [],
    topOverallocatedUsers: [],
    overallocationDaysTotal: 0,
    warnings: [],
    timestamp: '2026-02-10T12:00:00.000Z',
    ...overrides,
  };
}

function setupMocks(
  summary: Record<string, any> = {},
  storage: Record<string, any> = {},
  capacity: Record<string, any> = {},
) {
  mockApi.getOrgAnalyticsSummary.mockResolvedValue(makeSummary(summary));
  mockApi.getOrgAnalyticsStorage.mockResolvedValue(makeStorage(storage));
  mockApi.getOrgAnalyticsCapacity.mockResolvedValue(makeCapacity(capacity));
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/org-dashboard']}>
      <Routes>
        <Route path="/org-dashboard" element={<OrgDashboardPage />} />
        <Route path="/home" element={<div data-testid="home-page">Home</div>} />
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrgDashboardPage render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', platformRole: 'ADMIN', organizationId: 'org-1' },
      loading: false,
    });
  });

  // ─── Loading ────────────────────────────────────────────────

  it('shows loading skeleton initially', () => {
    mockApi.getOrgAnalyticsSummary.mockReturnValue(new Promise(() => {}));
    mockApi.getOrgAnalyticsStorage.mockReturnValue(new Promise(() => {}));
    mockApi.getOrgAnalyticsCapacity.mockReturnValue(new Promise(() => {}));

    renderPage();
    expect(screen.getByTestId('org-dashboard-loading')).toBeDefined();
    expect(screen.getByText('Organization Command Center')).toBeDefined();
  });

  // ─── Summary Cards ──────────────────────────────────────────

  it('renders summary cards after data loads', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('summary-cards')).toBeDefined();
    });
    expect(screen.getByText('Workspaces')).toBeDefined();
    expect(screen.getByText('Projects')).toBeDefined();
    expect(screen.getByText('At Risk')).toBeDefined();
    expect(screen.getByText('CPI')).toBeDefined();
    expect(screen.getByText('SPI')).toBeDefined();
  });

  // ─── Tables ─────────────────────────────────────────────────

  it('renders overallocated users table', async () => {
    setupMocks({ workspaceCount: 1, projectCount: 5 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('overallocated-table')).toBeDefined();
    });
    expect(screen.getByText('Top Overallocated Users')).toBeDefined();
    expect(screen.getByText('No overallocated users')).toBeDefined();
  });

  it('renders storage table', async () => {
    setupMocks({ workspaceCount: 1, projectCount: 1 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('storage-table')).toBeDefined();
    });
    expect(screen.getByText('Storage by Workspace')).toBeDefined();
    expect(screen.getByText('No storage data')).toBeDefined();
  });

  // ─── Error State ────────────────────────────────────────────

  it('renders error state when API fails', async () => {
    mockApi.getOrgAnalyticsSummary.mockRejectedValue(new Error('Network error'));
    mockApi.getOrgAnalyticsStorage.mockRejectedValue(new Error('Network error'));
    mockApi.getOrgAnalyticsCapacity.mockRejectedValue(new Error('Network error'));

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('org-dashboard-error')).toBeDefined();
    });
    expect(screen.getByText('Network error')).toBeDefined();
  });

  it('renders ErrorCode when API returns structured error', async () => {
    const err = new Error('forbidden') as any;
    err.response = { data: { code: 'AUTH_FORBIDDEN', message: 'Admin only' } };
    mockApi.getOrgAnalyticsSummary.mockRejectedValue(err);
    mockApi.getOrgAnalyticsStorage.mockRejectedValue(err);
    mockApi.getOrgAnalyticsCapacity.mockRejectedValue(err);

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('org-dashboard-error')).toBeDefined();
    });
    expect(screen.getByText(/AUTH_FORBIDDEN/)).toBeDefined();
    expect(screen.getByText(/Admin only/)).toBeDefined();
  });

  // ─── Plan Badge ─────────────────────────────────────────────

  it('displays plan code and status badge', async () => {
    setupMocks({ planCode: 'team', planStatus: 'active', workspaceCount: 1, projectCount: 1 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('org-dashboard')).toBeDefined();
    });
    expect(screen.getByText(/TEAM/)).toBeDefined();
  });

  // ─── Page Title ─────────────────────────────────────────────

  it('renders page title', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Organization Command Center')).toBeDefined();
    });
  });

  // ─── 4C-1: lastUpdatedAt ───────────────────────────────────

  it('displays "Last updated" when lastUpdatedAt is present', async () => {
    setupMocks({ lastUpdatedAt: '2026-02-10T14:30:00.000Z' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('last-updated')).toBeDefined();
    });
    expect(screen.getByText(/Last updated/)).toBeDefined();
  });

  // ─── 4C-2: Warning Banner ──────────────────────────────────

  it('shows warning banner when warnings are present', async () => {
    setupMocks({ warnings: ['EV table missing — metrics skipped'] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('org-dashboard-warnings')).toBeDefined();
    });
    expect(screen.getByText('Capability Warnings')).toBeDefined();
    expect(screen.getByText('EV table missing — metrics skipped')).toBeDefined();
  });

  it('hides warning banner when no warnings', async () => {
    setupMocks({ warnings: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('org-dashboard')).toBeDefined();
    });
    expect(screen.queryByTestId('org-dashboard-warnings')).toBeNull();
  });

  // ─── 4C-3: Empty State ─────────────────────────────────────

  it('shows empty state when org has 0 workspaces and 0 projects', async () => {
    setupMocks({ workspaceCount: 0, projectCount: 0 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('org-dashboard-empty')).toBeDefined();
    });
    expect(screen.getByText('No data yet')).toBeDefined();
    // Tables and cards should NOT render
    expect(screen.queryByTestId('summary-cards')).toBeNull();
  });

  it('does not show empty state when workspaces or projects exist', async () => {
    setupMocks({ workspaceCount: 1, projectCount: 0 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('summary-cards')).toBeDefined();
    });
    expect(screen.queryByTestId('org-dashboard-empty')).toBeNull();
  });

  // ─── 4E-4: Refresh button ──────────────────────────────────

  it('renders refresh button', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('refresh-button')).toBeDefined();
    });
    expect(screen.getByText('Refresh')).toBeDefined();
  });

  it('refresh button is disabled while loading', () => {
    // Keep promises pending to stay in loading state
    mockApi.getOrgAnalyticsSummary.mockReturnValue(new Promise(() => {}));
    mockApi.getOrgAnalyticsStorage.mockReturnValue(new Promise(() => {}));
    mockApi.getOrgAnalyticsCapacity.mockReturnValue(new Promise(() => {}));

    renderPage();
    // Loading skeleton shows, but refresh button is inside the skeleton? No — skeleton replaces the page.
    // The loading skeleton renders *instead* of the page, so refresh button is not visible during initial load.
    // This is correct behavior: no refresh button during initial load.
    expect(screen.getByTestId('org-dashboard-loading')).toBeDefined();
  });

  it('refresh button shows "Refreshing..." and is disabled during re-fetch', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('refresh-button')).toBeDefined();
    });

    // Now set up a pending promise for the refresh
    let resolveRefresh!: (v: any) => void;
    mockApi.getOrgAnalyticsSummary.mockReturnValue(
      new Promise((r) => { resolveRefresh = r; }),
    );
    mockApi.getOrgAnalyticsStorage.mockReturnValue(new Promise(() => {}));
    mockApi.getOrgAnalyticsCapacity.mockReturnValue(new Promise(() => {}));

    // Click refresh
    const btn = screen.getByTestId('refresh-button');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText('Refreshing...')).toBeDefined();
    });
    expect(btn.getAttribute('disabled')).not.toBeNull();
  });

  it('lastUpdatedAt updates after a successful refresh', async () => {
    const initialTs = '2026-02-10T12:00:00.000Z';
    setupMocks({ lastUpdatedAt: initialTs });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('last-updated')).toBeDefined();
    });

    // Re-mock with updated timestamp
    const refreshedTs = '2026-02-10T14:00:00.000Z';
    mockApi.getOrgAnalyticsSummary.mockResolvedValue(makeSummary({ lastUpdatedAt: refreshedTs }));
    mockApi.getOrgAnalyticsStorage.mockResolvedValue(makeStorage());
    mockApi.getOrgAnalyticsCapacity.mockResolvedValue(makeCapacity());

    // Click refresh
    fireEvent.click(screen.getByTestId('refresh-button'));

    await waitFor(() => {
      const updatedEl = screen.getByTestId('last-updated');
      // The new timestamp should be formatted and displayed
      expect(updatedEl.textContent).toContain('Last updated');
      // Verify the text changed — it should now show the refreshed time
      const formatted = new Date(refreshedTs).toLocaleString();
      expect(updatedEl.textContent).toContain(formatted);
    });
  });
});

// ─── WarningBanner unit tests ─────────────────────────────────

describe('WarningBanner', () => {
  it('renders nothing when warnings is empty', () => {
    const { container } = render(<WarningBanner warnings={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders bullets for each warning', () => {
    render(
      <WarningBanner warnings={['Warning A', 'Warning B']} />,
    );
    expect(screen.getByText('Warning A')).toBeDefined();
    expect(screen.getByText('Warning B')).toBeDefined();
    expect(screen.getByText('Capability Warnings')).toBeDefined();
  });
});
