import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectCreateModal } from '../ProjectCreateModal';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock useWorkspaceStore
vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(),
}));

// Mock telemetry
vi.mock('@/lib/telemetry', () => ({
  telemetry: {
    track: vi.fn(),
  },
}));

// Mock createProject
vi.mock('../api', () => ({
  createProject: vi.fn(),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ProjectCreateModal - Template Selection', () => {
  const mockTemplates = [
    { id: '1', name: 'Web App Development' },
    { id: '2', name: 'Marketing Campaign' },
  ];

  const mockOnCreated = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    const { useAuth } = require('@/state/AuthContext');
    const { useWorkspaceStore } = require('@/state/workspace.store');

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user1', organizationId: 'org1' },
      isAuthenticated: true,
    });

    vi.mocked(useWorkspaceStore).mockReturnValue({
      activeWorkspaceId: 'workspace1',
    });
  });

  it('uses blank project path by default', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { createProject } = await import('../api');

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: mockTemplates,
    });

    vi.mocked(createProject).mockResolvedValueOnce({
      id: 'project1',
      name: 'New Project',
    });

    renderWithQueryClient(
      <ProjectCreateModal
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
        workspaceId="workspace1"
      />
    );

    // Enter project name
    const nameInput = screen.getByPlaceholderText('Project name...');
    fireEvent.change(nameInput, { target: { value: 'New Project' } });

    // Submit without selecting template
    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith({
        name: 'New Project',
        workspaceId: 'workspace1',
      });
      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });

  it('calls applyTemplate when template is selected', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { createProject } = await import('../api');

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: mockTemplates,
    });

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        id: 'project1',
        name: 'New Project',
      },
    });

    renderWithQueryClient(
      <ProjectCreateModal
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
        workspaceId="workspace1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Template (optional)')).toBeInTheDocument();
    });

    // Enter project name
    const nameInput = screen.getByPlaceholderText('Project name...');
    fireEvent.change(nameInput, { target: { value: 'New Project' } });

    // Select template
    const templateSelect = screen.getByTestId('project-template-select');
    fireEvent.change(templateSelect, { target: { value: '1' } });

    // Submit
    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/admin/templates/1/apply',
        {
          name: 'New Project',
          workspaceId: 'workspace1',
        }
      );
      expect(createProject).not.toHaveBeenCalled();
    });
  });

  it('shows loading state for templates', async () => {
    const { apiClient } = await import('@/lib/api/client');

    // Delay the response to test loading state
    vi.mocked(apiClient.get).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ data: mockTemplates }), 100))
    );

    renderWithQueryClient(
      <ProjectCreateModal
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
        workspaceId="workspace1"
      />
    );

    expect(screen.getByText('Loading templates...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Loading templates...')).not.toBeInTheDocument();
    });
  });

  it('handles template API error gracefully', async () => {
    const { apiClient } = await import('@/lib/api/client');

    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Failed to load templates'));

    renderWithQueryClient(
      <ProjectCreateModal
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
        workspaceId="workspace1"
      />
    );

    await waitFor(() => {
      // Template selector should still render, just with no options
      expect(screen.getByText('Template (optional)')).toBeInTheDocument();
      const select = screen.getByTestId('project-template-select');
      expect(select).toBeInTheDocument();
      // Should only have "Start from scratch" option
      expect(select.querySelectorAll('option')).toHaveLength(1);
    });
  });
});

