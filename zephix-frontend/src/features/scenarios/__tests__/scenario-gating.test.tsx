/**
 * Phase 2F: Scenario Page Gating Tests
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUser = { platformRole: 'VIEWER', role: 'VIEWER' };
vi.mock('@/state/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('../scenarios.api', () => ({
  listScenarios: vi.fn().mockResolvedValue([
    {
      id: 'sc-1',
      name: 'Test Scenario',
      scopeType: 'project',
      scopeId: 'p1',
      status: 'draft',
      createdBy: 'u1',
      createdAt: '2026-02-09',
      updatedAt: '2026-02-09',
    },
  ]),
  createScenario: vi.fn(),
  getScenario: vi.fn().mockResolvedValue({
    id: 'sc-1',
    name: 'Test Scenario',
    actions: [],
    result: {
      summary: {
        before: { totalCapacityHours: 40, totalDemandHours: 32, overallocatedDays: 2, overallocatedUsers: 1, aggregateCPI: 0.95, aggregateSPI: 0.9, criticalPathSlipMinutes: 120, baselineDriftMinutes: 60 },
        after: { totalCapacityHours: 40, totalDemandHours: 28, overallocatedDays: 0, overallocatedUsers: 0, aggregateCPI: 1.0, aggregateSPI: 0.95, criticalPathSlipMinutes: 60, baselineDriftMinutes: 30 },
        deltas: { overallocatedDaysDelta: -2, overallocatedUsersDelta: -1, cpiDelta: 0.05, spiDelta: 0.05, criticalPathSlipDelta: -60, baselineDriftDelta: -30 },
        impactedProjects: [{ projectId: 'p1', projectName: 'Project 1', impactSummary: 'Affected by 1 action(s)' }],
      },
      warnings: [],
    },
  }),
  addAction: vi.fn(),
  removeAction: vi.fn(),
  computeScenario: vi.fn(),
  deleteScenario: vi.fn(),
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: {
    getState: () => ({ activeWorkspace: { id: 'ws-1' } }),
  },
}));

import ScenarioPage from '../ScenarioPage';

function setRole(role: string) {
  mockUser.platformRole = role;
  mockUser.role = role;
}

describe('ScenarioPage gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('VIEWER sees read-only label', async () => {
    setRole('VIEWER');
    render(<ScenarioPage />);
    await waitFor(() => {
      expect(screen.getByText(/Read-only/)).toBeTruthy();
    });
  });

  it('VIEWER does not see New button', async () => {
    setRole('VIEWER');
    render(<ScenarioPage />);
    await waitFor(() => {
      expect(screen.getByText(/What-If Scenarios/)).toBeTruthy();
    });
    expect(screen.queryByText('+ New')).toBeNull();
  });

  it('MEMBER sees read-only label', async () => {
    setRole('MEMBER');
    render(<ScenarioPage />);
    await waitFor(() => {
      expect(screen.getByText(/Read-only/)).toBeTruthy();
    });
  });

  it('MEMBER does not see New button', async () => {
    setRole('MEMBER');
    render(<ScenarioPage />);
    await waitFor(() => {
      expect(screen.getByText(/What-If Scenarios/)).toBeTruthy();
    });
    expect(screen.queryByText('+ New')).toBeNull();
  });

  it('ADMIN sees New button', async () => {
    setRole('ADMIN');
    render(<ScenarioPage />);
    await waitFor(() => {
      expect(screen.getByText('+ New')).toBeTruthy();
    });
  });

  it('ADMIN does not see read-only label', async () => {
    setRole('ADMIN');
    render(<ScenarioPage />);
    await waitFor(() => {
      expect(screen.getByText(/What-If Scenarios/)).toBeTruthy();
    });
    // Main description should not have (Read-only)
    const desc = screen.getByText(/Simulate schedule/);
    expect(desc.textContent).not.toContain('Read-only');
  });

  it('OWNER sees New button', async () => {
    setRole('OWNER');
    render(<ScenarioPage />);
    await waitFor(() => {
      expect(screen.getByText('+ New')).toBeTruthy();
    });
  });

  it('renders scenario list', async () => {
    setRole('ADMIN');
    render(<ScenarioPage />);
    await waitFor(() => {
      expect(screen.getByText('Test Scenario')).toBeTruthy();
    });
  });
});
