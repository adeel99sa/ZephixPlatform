import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DuplicateProjectModal } from '../DuplicateProjectModal';

// Mock dependencies
const mockNavigate = vi.fn();
const mockDuplicateProject = vi.fn();
const mockWorkspaceState = {
  activeWorkspaceId: 'test-workspace',
};

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: Object.assign(
    vi.fn(() => mockWorkspaceState),
    {
      getState: () => mockWorkspaceState,
    },
  ),
}));

vi.mock('../../projects.api', () => ({
  projectsApi: {
    duplicateProject: (...args: unknown[]) => mockDuplicateProject(...args),
  },
}));

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  projectId: 'proj-1',
  projectName: 'Test Project',
  workspaceId: 'ws-1',
};

describe('DuplicateProjectModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDuplicateProject.mockResolvedValue({
      newProjectId: 'new-proj-1',
      newProjectName: 'Test Project (Copy)',
      sourceProjectId: 'proj-1',
      phaseCount: 3,
      taskCount: 12,
    });
  });

  it('renders the structure-only duplicate form', () => {
    render(<DuplicateProjectModal {...defaultProps} />);

    expect(screen.getByText('Duplicate project')).toBeDefined();
    expect(screen.getByText(/Copies phases, tasks, methodology, and description/)).toBeDefined();
    expect(screen.getByTestId('clone-submit')).toBeDefined();
  });

  it('does not render deprecated clone mode options', () => {
    render(<DuplicateProjectModal {...defaultProps} />);

    expect(screen.queryByTestId('mode-structure-only')).toBeNull();
    expect(screen.queryByTestId('mode-full-clone')).toBeNull();
  });

  it('prefills name with (Copy) suffix', () => {
    render(<DuplicateProjectModal {...defaultProps} />);

    const input = screen.getByTestId('clone-name-input') as HTMLInputElement;
    expect(input.value).toBe('Test Project (Copy)');
  });

  it('calls clone API with correct payload on submit', async () => {
    render(<DuplicateProjectModal {...defaultProps} />);

    const submitBtn = screen.getByTestId('clone-submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockDuplicateProject).toHaveBeenCalledWith('proj-1', {
        newName: 'Test Project (Copy)',
      });
    });
  });

  it('navigates to new project on success', async () => {
    render(<DuplicateProjectModal {...defaultProps} />);

    const submitBtn = screen.getByTestId('clone-submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/w/test-workspace/projects/new-proj-1',
      );
    });
  });

  it('does not render when open is false', () => {
    render(<DuplicateProjectModal {...defaultProps} open={false} />);

    expect(screen.queryByText('Duplicate project')).toBeNull();
  });

  it('handles 409 conflict error', async () => {
    mockDuplicateProject.mockRejectedValue({
      response: { data: { code: 'CLONE_IN_PROGRESS', message: 'Already in progress' } },
    });

    const { toast } = await import('sonner');

    render(<DuplicateProjectModal {...defaultProps} />);

    const submitBtn = screen.getByTestId('clone-submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Already in progress');
    });
  });
});
