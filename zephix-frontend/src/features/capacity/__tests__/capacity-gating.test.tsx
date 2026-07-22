/**
 * Phase 2E: Capacity Page Gating Tests
 *
 * Tests role-based UI visibility:
 * - VIEWER: no edit controls, no recommendations
 * - MEMBER: no edit controls, no recommendations
 * - ADMIN/Owner: edit controls visible, recommendations visible
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the auth context
const mockUser = { platformRole: 'VIEWER', role: 'VIEWER' };
vi.mock('@/state/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock the API calls
vi.mock('../capacity.api', () => ({
  getUtilization: vi.fn().mockResolvedValue({
    perUserDaily: [],
    perUserWeekly: [
      {
        userId: 'u1',
        weekStart: '2026-02-09',
        totalCapacityHours: 40,
        totalDemandHours: 32,
        averageUtilization: 0.8,
        peakDayUtilization: 0.9,
        overallocatedDays: 0,
      },
    ],
    workspaceSummary: {
      totalCapacityHours: 40,
      totalDemandHours: 32,
      averageUtilization: 0.8,
      overallocatedUserCount: 0,
    },
  }),
  getOverallocations: vi.fn().mockResolvedValue({
    entries: [],
    totalOverallocatedDays: 0,
    affectedUserCount: 0,
  }),
  getRecommendations: vi.fn().mockResolvedValue({
    recommendations: [
      {
        taskId: 't1',
        taskTitle: 'Task 1',
        projectId: 'p1',
        userId: 'u1',
        currentStartDate: '2026-02-09',
        recommendedStartDate: '2026-02-10',
        shiftDays: 1,
        reason: 'Overallocated',
        isCriticalPath: false,
        totalFloatMinutes: 480,
      },
    ],
    resolvedOverloadDays: 1,
    remainingOverloadDays: 0,
  }),
}));

// Mock workspace store
vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: {
    getState: () => ({ activeWorkspace: { id: 'ws-1' } }),
  },
}));

import CapacityPage from '../CapacityPage';

function setRole(role: string) {
  mockUser.platformRole = role;
  mockUser.role = role;
}

describe('CapacityPage gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('VIEWER sees read-only label', async () => {
    setRole('VIEWER');
    render(<CapacityPage />);
    await waitFor(() => {
      expect(screen.getByText(/Read-only/)).toBeTruthy();
    });
  });

  it('VIEWER does not see Leveling Recommendations', async () => {
    setRole('VIEWER');
    render(<CapacityPage />);
    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText(/Total Capacity/)).toBeTruthy();
    });
    expect(screen.queryByText('Leveling Recommendations')).toBeNull();
  });

  it('MEMBER sees read-only label', async () => {
    setRole('MEMBER');
    render(<CapacityPage />);
    await waitFor(() => {
      expect(screen.getByText(/Read-only/)).toBeTruthy();
    });
  });

  it('MEMBER does not see Leveling Recommendations', async () => {
    setRole('MEMBER');
    render(<CapacityPage />);
    await waitFor(() => {
      expect(screen.getByText(/Total Capacity/)).toBeTruthy();
    });
    expect(screen.queryByText('Leveling Recommendations')).toBeNull();
  });

  it('ADMIN does not see read-only constraint label', async () => {
    setRole('ADMIN');
    render(<CapacityPage />);
    await waitFor(() => {
      expect(screen.getByText(/Total Capacity/)).toBeTruthy();
    });
    // The main description should not say "(Read-only)" — the recommendations section
    // has "Read-only suggestions" which is expected for ADMIN.
    const mainDesc = screen.getByText(/Time-phased capacity/);
    expect(mainDesc.textContent).not.toContain('(Read-only)');
  });

  it('ADMIN sees Leveling Recommendations', async () => {
    setRole('ADMIN');
    render(<CapacityPage />);
    await waitFor(() => {
      expect(screen.getByText('Leveling Recommendations')).toBeTruthy();
    });
  });

  it('OWNER sees Leveling Recommendations', async () => {
    setRole('OWNER');
    render(<CapacityPage />);
    await waitFor(() => {
      expect(screen.getByText('Leveling Recommendations')).toBeTruthy();
    });
  });

  it('renders summary cards with data', async () => {
    setRole('ADMIN');
    render(<CapacityPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Capacity')).toBeTruthy();
      expect(screen.getByText('40h')).toBeTruthy();
      expect(screen.getByText('32h')).toBeTruthy();
    });
    expect(screen.getAllByText('80.0%').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no capacity rows exist', async () => {
    const { getUtilization } = await import('../capacity.api');
    vi.mocked(getUtilization).mockResolvedValueOnce({
      perUserDaily: [],
      perUserWeekly: [],
      workspaceSummary: {
        totalCapacityHours: 0,
        totalDemandHours: 0,
        averageUtilization: 0,
        overallocatedUserCount: 0,
      },
    });
    setRole('ADMIN');
    render(<CapacityPage />);
    await waitFor(() => {
      expect(screen.getByTestId('capacity-empty-state')).toHaveTextContent(
        /No resource capacity recorded/,
      );
    });
    expect(screen.queryByText('Total Capacity')).toBeNull();
  });
});
