import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectKpisTab } from '@/features/projects/tabs/ProjectKpisTab';

// Mock workspace store
vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(() => ({ activeWorkspaceId: 'ws-1' })),
}));

// Mock workspace role
vi.mock('@/hooks/useWorkspaceRole', () => ({
  useWorkspaceRole: vi.fn(() => ({
    role: 'ADMIN',
    canWrite: true,
    isReadOnly: false,
    loading: false,
    error: null,
  })),
}));

// Mock project context
vi.mock('@/features/projects/layout/ProjectPageLayout', () => ({
  useProjectContext: vi.fn(() => ({
    project: {
      id: 'proj-1',
      name: 'Test Project',
      iterationsEnabled: true,
      costTrackingEnabled: true,
    },
    loading: false,
    error: null,
    refresh: vi.fn(),
  })),
}));

// Mock KPI API
vi.mock('@/features/kpis/api/projectKpis.api', () => ({
  getProjectKpiConfigs: vi.fn(),
  updateProjectKpiConfig: vi.fn(),
  getProjectKpiValues: vi.fn(),
  computeProjectKpis: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockConfigs = [
  {
    id: 'cfg-1',
    workspaceId: 'ws-1',
    projectId: 'proj-1',
    kpiDefinitionId: 'def-wip',
    enabled: true,
    thresholdWarning: null,
    thresholdCritical: null,
    target: { value: '10' },
    kpiDefinition: {
      id: 'def-wip',
      code: 'wip',
      name: 'Work in Progress',
      category: 'DELIVERY',
      unit: 'items',
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cfg-2',
    workspaceId: 'ws-1',
    projectId: 'proj-1',
    kpiDefinitionId: 'def-velocity',
    enabled: true,
    thresholdWarning: null,
    thresholdCritical: null,
    target: null,
    kpiDefinition: {
      id: 'def-velocity',
      code: 'velocity',
      name: 'Velocity',
      category: 'DELIVERY',
      unit: 'points',
      requiredGovernanceFlag: 'iterationsEnabled',
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockValues = [
  {
    id: 'val-1',
    workspaceId: 'ws-1',
    projectId: 'proj-1',
    kpiDefinitionId: 'def-wip',
    asOfDate: '2026-02-10',
    valueNumeric: '5',
    valueText: null,
    valueJson: { engineVersion: '1.0.0', statusFilter: 'IN_PROGRESS' },
    sampleSize: 5,
    computedAt: '2026-02-10T12:00:00Z',
  },
];

const mockComputeResult = {
  computed: mockValues,
  skipped: [
    {
      kpiCode: 'budget_burn',
      kpiName: 'Budget Burn Rate',
      reason: 'GOVERNANCE_FLAG_DISABLED',
      governanceFlag: 'costTrackingEnabled',
    },
  ],
};

function renderTab() {
  return render(
    <MemoryRouter initialEntries={['/projects/proj-1/kpis']}>
      <Routes>
        <Route path="/projects/:projectId/kpis" element={<ProjectKpisTab />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProjectKpisTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders computed and skipped KPIs correctly', async () => {
    const api = await import('@/features/kpis/api/projectKpis.api');
    vi.mocked(api.getProjectKpiConfigs).mockResolvedValue(mockConfigs as any);
    vi.mocked(api.getProjectKpiValues).mockResolvedValue(mockValues as any);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText('Work in Progress')).toBeInTheDocument();
      expect(screen.getByText('Velocity')).toBeInTheDocument();
      expect(screen.getByText('KPI Configuration')).toBeInTheDocument();
    });
  });

  it('shows Compute now button and calls POST on click', async () => {
    const api = await import('@/features/kpis/api/projectKpis.api');
    vi.mocked(api.getProjectKpiConfigs).mockResolvedValue(mockConfigs as any);
    vi.mocked(api.getProjectKpiValues).mockResolvedValue([]);
    vi.mocked(api.computeProjectKpis).mockResolvedValue(mockComputeResult as any);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText('Compute now')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Compute now'));
    });

    await waitFor(() => {
      expect(api.computeProjectKpis).toHaveBeenCalledWith('ws-1', 'proj-1');
    });
  });

  it('shows skipped KPIs with governance flag reason after compute', async () => {
    const api = await import('@/features/kpis/api/projectKpis.api');
    vi.mocked(api.getProjectKpiConfigs).mockResolvedValue(mockConfigs as any);
    vi.mocked(api.getProjectKpiValues).mockResolvedValue([]);
    vi.mocked(api.computeProjectKpis).mockResolvedValue(mockComputeResult as any);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText('Compute now')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Compute now'));
    });

    await waitFor(() => {
      expect(screen.getByText('Skipped KPIs (1)')).toBeInTheDocument();
      expect(screen.getByText('Budget Burn Rate')).toBeInTheDocument();
      expect(screen.getByText('(costTrackingEnabled)')).toBeInTheDocument();
    });
  });

  it('toggle enabled calls PATCH with correct payload', async () => {
    const api = await import('@/features/kpis/api/projectKpis.api');
    vi.mocked(api.getProjectKpiConfigs).mockResolvedValue(mockConfigs as any);
    vi.mocked(api.getProjectKpiValues).mockResolvedValue([]);
    vi.mocked(api.updateProjectKpiConfig).mockResolvedValue(mockConfigs[0] as any);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText('Work in Progress')).toBeInTheDocument();
    });

    // Find toggle checkboxes (both are enabled)
    const toggles = screen.getAllByRole('checkbox');
    expect(toggles.length).toBeGreaterThanOrEqual(2);

    // Uncheck first toggle
    await act(async () => {
      fireEvent.click(toggles[0]);
    });

    await waitFor(() => {
      expect(api.updateProjectKpiConfig).toHaveBeenCalledWith(
        'ws-1',
        'proj-1',
        'def-wip',
        { enabled: false },
      );
    });
  });

  it('shows empty state when no configs', async () => {
    const api = await import('@/features/kpis/api/projectKpis.api');
    vi.mocked(api.getProjectKpiConfigs).mockResolvedValue([]);
    vi.mocked(api.getProjectKpiValues).mockResolvedValue([]);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText('No KPIs configured')).toBeInTheDocument();
    });
  });

  it('displays engine version from value metadata', async () => {
    const api = await import('@/features/kpis/api/projectKpis.api');
    vi.mocked(api.getProjectKpiConfigs).mockResolvedValue(mockConfigs as any);
    vi.mocked(api.getProjectKpiValues).mockResolvedValue(mockValues as any);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText('Engine v1.0.0')).toBeInTheDocument();
    });
  });
});
