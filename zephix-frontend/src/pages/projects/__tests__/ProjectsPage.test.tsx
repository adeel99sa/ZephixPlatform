import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ProjectsPage from '../ProjectsPage';

// Mock the API client
vi.mock('../../../lib/api/client', () => ({
  default: (await import('../../../test/mocks/apiClient.mock')).default
}));

import apiClient from '../../../lib/api/client';

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
    apiClient.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<ProjectsPage />);

    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Manage your projects and track their progress')).toBeInTheDocument();
  });

  it('renders empty state when no projects', async () => {
    apiClient.get.mockResolvedValue({
      data: { items: [], total: 0, page: 1, pageSize: 20 },
    });

    renderWithProviders(<ProjectsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/No (data|projects) (available|found)/i)
      ).toBeInTheDocument();
    });
  });

  it('renders projects list when projects exist', async () => {
    const mockProjects = [
      {
        id: '1',
        key: 'PROJ-001',
        name: 'Test Project',
        description: 'Test Description',
        status: 'active',
        ownerName: 'John Doe',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        progressPct: 50,
        budgetUsed: 5000,
        budgetTotal: 10000,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
    ];

    apiClient.get.mockResolvedValue({
      data: { items: mockProjects, total: 1, page: 1, pageSize: 20 },
    });

    renderWithProviders(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('PROJ-001')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('shows create project button', () => {
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText('Create Project')).toBeInTheDocument();
  });
});
