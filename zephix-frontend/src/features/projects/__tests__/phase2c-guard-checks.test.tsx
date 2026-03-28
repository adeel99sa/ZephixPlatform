/**
 * Phase 2C: Frontend guard check tests.
 * Validates role-based visibility for Gantt, Baseline, and Earned Value panels.
 * No UI redesign — gating correctness only.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useParams: vi.fn(() => ({ projectId: 'proj-1' })),
}));

// Mock workspace store
vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(() => ({ activeWorkspaceId: 'ws-1' })),
}));

// Mock auth — overridden per test
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock schedule API
vi.mock('@/features/work-management/schedule.api', () => ({
  getProjectSchedule: vi.fn().mockResolvedValue({
    tasks: [],
    dependencies: [],
    criticalPathTaskIds: [],
  }),
  patchTaskSchedule: vi.fn(),
  listBaselines: vi.fn().mockResolvedValue([]),
  createBaseline: vi.fn(),
  activateBaseline: vi.fn(),
  compareBaseline: vi.fn(),
  getEarnedValue: vi.fn(),
  createEVSnapshot: vi.fn(),
}));

// Mock gantt-task-react since it needs canvas
vi.mock('gantt-task-react', () => ({
  Gantt: () => <div data-testid="gantt-component" />,
  ViewMode: { Week: 'Week' },
}));

// Import after mocks
import { BaselinePanel } from '../components/BaselinePanel';
import { EarnedValuePanel } from '../components/EarnedValuePanel';

describe('Phase 2C — Frontend Guard Checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── BaselinePanel ──────────────────────────────────────────────────

  describe('BaselinePanel', () => {
    it('renders for workspace_owner', () => {
      mockUseAuth.mockReturnValue({ user: { platformRole: 'MEMBER' } });
      render(
        <BaselinePanel
          projectId="proj-1"
          baselinesEnabled={true}
          workspaceRole="workspace_owner"
        />,
      );
      expect(screen.getByTestId('baseline-panel')).toBeTruthy();
    });

    it('renders for platform ADMIN', () => {
      mockUseAuth.mockReturnValue({ user: { platformRole: 'ADMIN' } });
      render(
        <BaselinePanel
          projectId="proj-1"
          baselinesEnabled={true}
          workspaceRole="workspace_member"
        />,
      );
      expect(screen.getByTestId('baseline-panel')).toBeTruthy();
    });

    it('does NOT render for MEMBER without owner role', () => {
      mockUseAuth.mockReturnValue({ user: { platformRole: 'MEMBER' } });
      const { container } = render(
        <BaselinePanel
          projectId="proj-1"
          baselinesEnabled={true}
          workspaceRole="workspace_member"
        />,
      );
      expect(container.innerHTML).toBe('');
    });

    it('does NOT render when baselinesEnabled is false', () => {
      mockUseAuth.mockReturnValue({ user: { platformRole: 'ADMIN' } });
      const { container } = render(
        <BaselinePanel
          projectId="proj-1"
          baselinesEnabled={false}
          workspaceRole="workspace_owner"
        />,
      );
      expect(container.innerHTML).toBe('');
    });

    it('does NOT render for VIEWER (guest)', () => {
      mockUseAuth.mockReturnValue({ user: { platformRole: 'VIEWER' } });
      const { container } = render(
        <BaselinePanel
          projectId="proj-1"
          baselinesEnabled={true}
          workspaceRole="workspace_viewer"
        />,
      );
      expect(container.innerHTML).toBe('');
    });
  });

  // ── EarnedValuePanel ───────────────────────────────────────────────

  describe('EarnedValuePanel', () => {
    it('renders for workspace_owner', () => {
      mockUseAuth.mockReturnValue({ user: { platformRole: 'MEMBER' } });
      render(
        <EarnedValuePanel
          projectId="proj-1"
          earnedValueEnabled={true}
          workspaceRole="workspace_owner"
        />,
      );
      expect(screen.getByTestId('earned-value-panel')).toBeTruthy();
    });

    it('renders for platform ADMIN', () => {
      mockUseAuth.mockReturnValue({ user: { platformRole: 'ADMIN' } });
      render(
        <EarnedValuePanel
          projectId="proj-1"
          earnedValueEnabled={true}
          workspaceRole="workspace_member"
        />,
      );
      expect(screen.getByTestId('earned-value-panel')).toBeTruthy();
    });

    it('does NOT render for MEMBER without owner role', () => {
      mockUseAuth.mockReturnValue({ user: { platformRole: 'MEMBER' } });
      const { container } = render(
        <EarnedValuePanel
          projectId="proj-1"
          earnedValueEnabled={true}
          workspaceRole="workspace_member"
        />,
      );
      expect(container.innerHTML).toBe('');
    });

    it('does NOT render when earnedValueEnabled is false', () => {
      mockUseAuth.mockReturnValue({ user: { platformRole: 'ADMIN' } });
      const { container } = render(
        <EarnedValuePanel
          projectId="proj-1"
          earnedValueEnabled={false}
          workspaceRole="workspace_owner"
        />,
      );
      expect(container.innerHTML).toBe('');
    });

    it('does NOT render for VIEWER (guest)', () => {
      mockUseAuth.mockReturnValue({ user: { platformRole: 'VIEWER' } });
      const { container } = render(
        <EarnedValuePanel
          projectId="proj-1"
          earnedValueEnabled={true}
          workspaceRole="workspace_viewer"
        />,
      );
      expect(container.innerHTML).toBe('');
    });
  });
});
