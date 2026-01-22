import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ProjectPlanView } from '../ProjectPlanView';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { usePhaseUpdate } from '@/features/work-management/hooks/usePhaseUpdate';
import * as phasesApi from '@/features/work-management/api/phases.api';
import api from '@/services/api';

// Mock dependencies
vi.mock('@/state/workspace.store');
vi.mock('@/hooks/useWorkspaceRole');
vi.mock('@/features/work-management/hooks/usePhaseUpdate');
vi.mock('@/services/api');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ projectId: 'test-project-id' }),
    useNavigate: () => vi.fn(),
  };
});

const mockUseWorkspaceStore = vi.mocked(useWorkspaceStore);
const mockUseWorkspaceRole = vi.mocked(useWorkspaceRole);
const mockUsePhaseUpdate = vi.mocked(usePhaseUpdate);
const mockApi = vi.mocked(api);

describe('ProjectPlanView - Milestone Due Date Edit and Ack Flow', () => {
  const mockPlan = {
    projectId: 'test-project-id',
    projectName: 'Test Project',
    projectState: 'ACTIVE',
    structureLocked: true,
    phases: [
      {
        phaseId: 'phase-1',
        name: 'Phase 1',
        sortOrder: 1,
        isMilestone: true,
        isLocked: true,
        dueDate: '2024-12-31T00:00:00Z',
        tasks: [],
      },
    ],
  };

  const mockAckResponse = {
    ack: {
      token: 'ack-token-123',
      impactSummary: 'This change will impact 2 tasks',
      impactedEntities: [
        { id: 'task-1', name: 'Task 1', type: 'task' },
        { id: 'task-2', name: 'Task 2', type: 'task' },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockUseWorkspaceStore.mockReturnValue({
      activeWorkspaceId: 'workspace-1',
      workspaceRole: null,
      workspaceReady: true,
      setActiveWorkspace: vi.fn(),
      setWorkspaceRole: vi.fn(),
      isReadOnly: false,
      canWrite: true,
    });

    mockUseWorkspaceRole.mockReturnValue({
      workspaceRole: 'workspace_owner',
      isReadOnly: false,
      canWrite: true,
    });

    // Mock plan API response
    mockApi.get.mockResolvedValue({
      data: { data: mockPlan },
    });
  });

  it('shows Edit date button for milestone phases when canWrite is true', async () => {
    const mockUpdatePhase = vi.fn();
    mockUsePhaseUpdate.mockReturnValue({
      updatePhase: mockUpdatePhase,
      loading: false,
      error: null,
      ackRequired: null,
      confirmAck: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ProjectPlanView />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Phase 1')).toBeInTheDocument();
    });

    // Should show due date
    expect(screen.getByText(/12\/31\/2024/)).toBeInTheDocument();

    // Should show Edit date button
    const editButton = screen.getByText('Edit date');
    expect(editButton).toBeInTheDocument();
  });

  it('opens date picker when Edit date is clicked', async () => {
    const user = userEvent.setup();
    const mockUpdatePhase = vi.fn();
    mockUsePhaseUpdate.mockReturnValue({
      updatePhase: mockUpdatePhase,
      loading: false,
      error: null,
      ackRequired: null,
      confirmAck: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ProjectPlanView />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Edit date')).toBeInTheDocument();
    });

    const editButton = screen.getByText('Edit date');
    await user.click(editButton);

    // Should show date input and Save/Cancel buttons
    await waitFor(() => {
      expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('shows ack modal when update returns ACK_REQUIRED', async () => {
    const user = userEvent.setup();
    const mockUpdatePhase = vi.fn();
    const mockConfirmAck = vi.fn();

    // First call returns ack required
    mockUpdatePhase.mockResolvedValueOnce(mockAckResponse);

    mockUsePhaseUpdate.mockReturnValue({
      updatePhase: mockUpdatePhase,
      loading: false,
      error: null,
      ackRequired: mockAckResponse,
      confirmAck: mockConfirmAck,
    });

    render(
      <BrowserRouter>
        <ProjectPlanView />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Edit date')).toBeInTheDocument();
    });

    const editButton = screen.getByText('Edit date');
    await user.click(editButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument();
    });

    // Change date
    const dateInput = screen.getByDisplayValue('2024-12-31');
    await user.clear(dateInput);
    await user.type(dateInput, '2025-01-15');

    // Click Save
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    // Should call updatePhase
    await waitFor(() => {
      expect(mockUpdatePhase).toHaveBeenCalledWith('phase-1', {
        dueDate: expect.stringContaining('2025-01-15'),
      });
    });

    // Should show ack modal
    await waitFor(() => {
      expect(screen.getByText('Confirmation required')).toBeInTheDocument();
      expect(screen.getByText(/This change will impact/)).toBeInTheDocument();
    });
  });

  it('calls confirmAck and refreshes plan when ack is confirmed', async () => {
    const user = userEvent.setup();
    const mockUpdatePhase = vi.fn();
    const mockConfirmAck = vi.fn();

    // Mock successful update after ack
    const mockUpdatedPhase = {
      ...mockPlan.phases[0],
      dueDate: '2025-01-15T00:00:00Z',
    };

    mockUpdatePhase.mockResolvedValueOnce(mockAckResponse);
    mockUpdatePhase.mockResolvedValueOnce(mockUpdatedPhase);

    mockUsePhaseUpdate.mockReturnValue({
      updatePhase: mockUpdatePhase,
      loading: false,
      error: null,
      ackRequired: mockAckResponse,
      confirmAck: mockConfirmAck,
    });

    render(
      <BrowserRouter>
        <ProjectPlanView />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Edit date')).toBeInTheDocument();
    });

    // Open edit mode
    const editButton = screen.getByText('Edit date');
    await user.click(editButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument();
    });

    // Change date and save
    const dateInput = screen.getByDisplayValue('2024-12-31');
    await user.clear(dateInput);
    await user.type(dateInput, '2025-01-15');

    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    // Wait for ack modal
    await waitFor(() => {
      expect(screen.getByText('Confirmation required')).toBeInTheDocument();
    });

    // Click Confirm change
    const confirmButton = screen.getByText('Confirm change');
    await user.click(confirmButton);

    // Should call confirmAck
    await waitFor(() => {
      expect(mockConfirmAck).toHaveBeenCalled();
    });
  });

  it('does not show Edit date for read-only users', async () => {
    mockUseWorkspaceStore.mockReturnValue({
      activeWorkspaceId: 'workspace-1',
      workspaceRole: null,
      workspaceReady: true,
      setActiveWorkspace: vi.fn(),
      setWorkspaceRole: vi.fn(),
      isReadOnly: true,
      canWrite: false,
    });

    mockUseWorkspaceRole.mockReturnValue({
      workspaceRole: 'workspace_viewer',
      isReadOnly: true,
      canWrite: false,
    });

    const mockUpdatePhase = vi.fn();
    mockUsePhaseUpdate.mockReturnValue({
      updatePhase: mockUpdatePhase,
      loading: false,
      error: null,
      ackRequired: null,
      confirmAck: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ProjectPlanView />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Phase 1')).toBeInTheDocument();
    });

    // Should show due date but not Edit button
    expect(screen.getByText(/12\/31\/2024/)).toBeInTheDocument();
    expect(screen.queryByText('Edit date')).not.toBeInTheDocument();
  });

  it('does not show Edit date for non-milestone phases', async () => {
    const nonMilestonePlan = {
      ...mockPlan,
      phases: [
        {
          ...mockPlan.phases[0],
          isMilestone: false,
        },
      ],
    };

    mockApi.get.mockResolvedValueOnce({
      data: { data: nonMilestonePlan },
    });

    const mockUpdatePhase = vi.fn();
    mockUsePhaseUpdate.mockReturnValue({
      updatePhase: mockUpdatePhase,
      loading: false,
      error: null,
      ackRequired: null,
      confirmAck: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ProjectPlanView />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Phase 1')).toBeInTheDocument();
    });

    // Should show dash for non-milestone
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('Edit date')).not.toBeInTheDocument();
  });
});

