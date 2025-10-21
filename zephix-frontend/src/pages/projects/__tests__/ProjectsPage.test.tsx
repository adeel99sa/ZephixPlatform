import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ProjectsPage from '../ProjectsPage';

// Mock the API client
vi.mock('../../../lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the CreateProjectPanel component
vi.mock('../../../components/projects/CreateProjectPanel', () => ({
  CreateProjectPanel: ({ isOpen, onClose, onSuccess }: any) => (
    isOpen ? <div data-testid="create-project-panel">Create Project Panel</div> : null
  ),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', async () => {
    const { apiClient } = await import('../../../lib/api/client');
    vi.mocked(apiClient.get).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<ProjectsPage />);

    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Manage your projects and track their progress')).toBeInTheDocument();
  });

  it('renders empty state when no projects', async () => {
    const { apiClient } = await import('../../../lib/api/client');
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { projects: [] },
      success: true,
    });

    renderWithProviders(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('No projects found')).toBeInTheDocument();
      expect(screen.getByText('Create your first project to get started with project management.')).toBeInTheDocument();
    });
  });

  it('renders projects list when projects exist', async () => {
    const mockProjects = [
      {
        id: '1',
        name: 'Test Project',
        description: 'Test Description',
        status: 'active',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
    ];

    const { apiClient } = await import('../../../lib/api/client');
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { projects: mockProjects },
      success: true,
    });

    renderWithProviders(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });
  });

  it('shows create project button', () => {
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText('Create Project')).toBeInTheDocument();
  });
});
