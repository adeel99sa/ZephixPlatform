import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DuplicateProjectModal } from '../DuplicateProjectModal';

// Mock dependencies
const mockNavigate = vi.fn();
const mockMutateAsync = vi.fn();

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
  useWorkspaceStore: () => ({
    activeWorkspaceId: 'test-workspace',
  }),
}));

vi.mock('../../api/useCloneProject', () => ({
  useCloneProject: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
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
    mockMutateAsync.mockResolvedValue({
      newProjectId: 'new-proj-1',
      sourceProjectId: 'proj-1',
      mode: 'structure_only',
      cloneRequestId: 'req-1',
      name: 'Test Project (Copy)',
      workspaceId: 'ws-1',
    });
  });

  it('renders two options with Structure only selected by default', () => {
    render(<DuplicateProjectModal {...defaultProps} />);

    const structureOnly = screen.getByTestId('mode-structure-only');
    const fullClone = screen.getByTestId('mode-full-clone');

    expect(structureOnly).toBeDefined();
    expect(fullClone).toBeDefined();

    // Structure only should have the checked radio
    const checkedRadio = structureOnly.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(checkedRadio?.checked).toBe(true);
  });

  it('Clone with work option is disabled', () => {
    render(<DuplicateProjectModal {...defaultProps} />);

    const fullClone = screen.getByTestId('mode-full-clone');
    const radio = fullClone.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(radio?.disabled).toBe(true);

    // Should show "Coming next" text
    expect(fullClone.textContent).toContain('Coming next');
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
      expect(mockMutateAsync).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        mode: 'structure_only',
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
    mockMutateAsync.mockRejectedValue({
      response: { data: { code: 'CLONE_IN_PROGRESS', message: 'Already in progress' } },
    });

    const { toast } = await import('sonner');

    render(<DuplicateProjectModal {...defaultProps} />);

    const submitBtn = screen.getByTestId('clone-submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('A duplication is already in progress');
    });
  });
});
