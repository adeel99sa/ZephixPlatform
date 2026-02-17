import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectChangeRequestsTab } from '../ProjectChangeRequestsTab';
import type { ChangeRequest } from '@/features/change-requests/types';

const MOCK_CR: ChangeRequest = {
  id: 'cr-1',
  workspaceId: 'ws-1',
  projectId: 'proj-1',
  title: 'Add mobile support',
  description: 'Extend platform to mobile devices',
  reason: 'Customer demand',
  impactScope: 'SCOPE',
  impactCost: '50000.00',
  impactDays: 30,
  status: 'DRAFT',
  createdByUserId: 'user-1',
  approvedByUserId: null,
  approvedAt: null,
  rejectedByUserId: null,
  rejectedAt: null,
  rejectionReason: null,
  implementedByUserId: null,
  implementedAt: null,
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-01-15T00:00:00Z',
};

const MOCK_CR_SUBMITTED: ChangeRequest = {
  ...MOCK_CR,
  id: 'cr-2',
  title: 'Upgrade DB',
  status: 'SUBMITTED',
};

// Mock API
vi.mock('@/features/change-requests/changeRequests.api', () => ({
  listChangeRequests: vi.fn(),
  createChangeRequest: vi.fn(),
  submitChangeRequest: vi.fn(),
  approveChangeRequest: vi.fn(),
  rejectChangeRequest: vi.fn(),
  implementChangeRequest: vi.fn(),
  deleteChangeRequest: vi.fn(),
}));

// Mock workspace store
vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: () => ({ activeWorkspaceId: 'ws-1' }),
}));

// Mock useWorkspaceRole
vi.mock('@/hooks/useWorkspaceRole', () => ({
  useWorkspaceRole: () => ({ role: 'ADMIN', canWrite: true, isReadOnly: false }),
}));

// Mock ProjectContext
vi.mock('../../layout/ProjectPageLayout', () => ({
  useProjectContext: () => ({
    project: { id: 'proj-1', name: 'Test Project' },
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

import {
  listChangeRequests,
  createChangeRequest,
} from '@/features/change-requests/changeRequests.api';

function renderTab() {
  return render(
    <MemoryRouter initialEntries={['/projects/proj-1/change-requests']}>
      <Routes>
        <Route path="/projects/:projectId/change-requests" element={<ProjectChangeRequestsTab />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProjectChangeRequestsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of change requests', async () => {
    (listChangeRequests as ReturnType<typeof vi.fn>).mockResolvedValue([MOCK_CR, MOCK_CR_SUBMITTED]);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText('Add mobile support')).toBeInTheDocument();
      expect(screen.getByText('Upgrade DB')).toBeInTheDocument();
    });

    expect(screen.getByText('DRAFT')).toBeInTheDocument();
    expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
  });

  it('renders empty state when no change requests', async () => {
    (listChangeRequests as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText(/no change requests yet/i)).toBeInTheDocument();
    });
  });

  it('shows create form when clicking New Change Request', async () => {
    (listChangeRequests as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText(/new change request/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/new change request/i));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/brief title/i)).toBeInTheDocument();
    });
  });

  it('creates a change request via form', async () => {
    (listChangeRequests as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createChangeRequest as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_CR);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText(/new change request/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/new change request/i));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/brief title/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/brief title/i), {
      target: { value: 'Test CR' },
    });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(createChangeRequest).toHaveBeenCalledWith('proj-1', expect.objectContaining({
        title: 'Test CR',
        impactScope: 'SCOPE',
      }));
    });
  });

  it('shows approve/reject buttons for SUBMITTED CRs when user is ADMIN', async () => {
    (listChangeRequests as ReturnType<typeof vi.fn>).mockResolvedValue([MOCK_CR_SUBMITTED]);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText('Upgrade DB')).toBeInTheDocument();
    });

    expect(screen.getByTitle('Approve')).toBeInTheDocument();
    expect(screen.getByTitle('Reject')).toBeInTheDocument();
  });

  it('shows submit and delete buttons for DRAFT CRs', async () => {
    (listChangeRequests as ReturnType<typeof vi.fn>).mockResolvedValue([MOCK_CR]);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText('Add mobile support')).toBeInTheDocument();
    });

    expect(screen.getByTitle('Submit')).toBeInTheDocument();
    expect(screen.getByTitle('Delete')).toBeInTheDocument();
  });
});
