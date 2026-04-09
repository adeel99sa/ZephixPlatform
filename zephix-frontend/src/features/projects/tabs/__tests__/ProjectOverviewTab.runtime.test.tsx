import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProjectOverviewTab } from '../ProjectOverviewTab';

const { mockApiGet } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: mockApiGet,
    post: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ projectId: 'proj-1' })),
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  };
});

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(() => ({ activeWorkspaceId: 'ws-1' })),
}));

vi.mock('@/hooks/useWorkspaceRole', () => ({
  useWorkspaceRole: vi.fn(() => ({ canWrite: true, isReadOnly: false })),
}));

vi.mock('../../layout/ProjectPageLayout', () => ({
  useProjectContext: vi.fn(() => ({
    project: {
      id: 'proj-1',
      workspaceId: 'ws-1',
      workspaceRole: 'workspace_owner',
    },
    refresh: vi.fn(),
    overviewSnapshot: {
      projectId: 'proj-1',
      projectName: 'Project One',
      projectState: 'DRAFT',
      structureLocked: false,
      startedAt: null,
      deliveryOwnerUserId: null,
      dateRange: { startDate: null, dueDate: null },
      healthCode: 'HEALTHY',
      healthLabel: 'Healthy',
      behindTargetDays: null,
      needsAttention: [],
      nextActions: [],
    },
    overviewLoading: false,
    refreshOverviewSnapshot: vi.fn(),
  })),
}));

vi.mock('../../hooks/useProjectCapabilities', () => ({
  useProjectCapabilities: vi.fn(() => ({
    baselinesEnabled: false,
    earnedValueEnabled: false,
  })),
}));

vi.mock('../../components/ProjectLinkingSection', () => ({
  ProjectLinkingSection: () => null,
}));

vi.mock('../../components/ProjectMetadataCard', () => ({
  ProjectMetadataCard: () => <div data-testid="project-metadata-card-stub" />,
}));

vi.mock('../../components/ProjectKpiPanel', () => ({
  ProjectKpiPanel: () => null,
}));

vi.mock('../../components/BudgetSummaryPanel', () => ({
  BudgetSummaryPanel: () => null,
}));

vi.mock('../../components/BaselinePanel', () => ({
  BaselinePanel: () => null,
}));

vi.mock('../../components/EarnedValuePanel', () => ({
  EarnedValuePanel: () => null,
}));

describe('ProjectOverviewTab runtime safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with empty action lists without crashing (healthy health hidden)', async () => {
    render(
      <BrowserRouter>
        <ProjectOverviewTab />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Open Plan')).toBeInTheDocument();
    });
    expect(screen.queryByText('Healthy')).toBeNull();
    expect(screen.queryByTestId('project-overview-immediate-actions')).toBeNull();
  });
});
