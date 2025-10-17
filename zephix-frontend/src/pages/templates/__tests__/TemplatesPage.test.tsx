import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TemplatesPage } from '../TemplatesPage';

// Mock the API client
vi.mock('../../lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    delete: vi.fn(),
  },
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

describe('TemplatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and create button', () => {
    renderWithQueryClient(<TemplatesPage />);
    
    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.getByText('Manage your project and workflow templates')).toBeInTheDocument();
    expect(screen.getByText('Create Template')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    renderWithQueryClient(<TemplatesPage />);
    
    // Check for loading skeleton elements
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows empty state when no templates', async () => {
    const { apiClient } = await import('../../lib/api/client');
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { templates: [] },
    });

    renderWithQueryClient(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('No templates found')).toBeInTheDocument();
      expect(screen.getByText('Create your first template to get started with project management.')).toBeInTheDocument();
    });
  });

  it('shows error banner when API fails', async () => {
    const { apiClient } = await import('../../lib/api/client');
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('API Error'));

    renderWithQueryClient(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load templates')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('displays templates in DataTable when loaded', async () => {
    const mockTemplates = [
      {
        id: '1',
        name: 'Project Template',
        description: 'A basic project template',
        category: 'project' as const,
        status: 'active' as const,
        version: '1.0.0',
        createdBy: 'user1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-15',
        organizationId: 'org1',
        usageCount: 5,
        tags: ['project', 'basic'],
        parameters: {},
        isPublic: false,
      },
    ];

    const { apiClient } = await import('../../lib/api/client');
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { templates: mockTemplates },
    });

    renderWithQueryClient(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Project Template')).toBeInTheDocument();
      expect(screen.getByText('A basic project template')).toBeInTheDocument();
      expect(screen.getByText('project')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });
  });

  it('handles delete template action', async () => {
    const mockTemplates = [
      {
        id: '1',
        name: 'Test Template',
        description: 'Test description',
        category: 'project' as const,
        status: 'active' as const,
        version: '1.0.0',
        createdBy: 'user1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-15',
        organizationId: 'org1',
        usageCount: 0,
        tags: [],
        parameters: {},
        isPublic: false,
      },
    ];

    const { apiClient } = await import('../../lib/api/client');
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { templates: mockTemplates },
    });
    vi.mocked(apiClient.delete).mockResolvedValueOnce({});

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithQueryClient(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Template')).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText('Delete template Test Template');
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this template?');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/templates/1');

    confirmSpy.mockRestore();
  });

  it('supports keyboard navigation for sorting', async () => {
    const mockTemplates = [
      {
        id: '1',
        name: 'A Template',
        description: 'Description',
        category: 'project' as const,
        status: 'active' as const,
        version: '1.0.0',
        createdBy: 'user1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-15',
        organizationId: 'org1',
        usageCount: 0,
        tags: [],
        parameters: {},
        isPublic: false,
      },
    ];

    const { apiClient } = await import('../../lib/api/client');
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { templates: mockTemplates },
    });

    renderWithQueryClient(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('A Template')).toBeInTheDocument();
    });

    const nameHeader = screen.getByRole('columnheader', { name: /template name/i });
    nameHeader.focus();
    
    fireEvent.keyDown(nameHeader, { key: 'Enter' });
    expect(nameHeader).toHaveAttribute('aria-sort', 'asc');

    fireEvent.keyDown(nameHeader, { key: 'Enter' });
    expect(nameHeader).toHaveAttribute('aria-sort', 'desc');
  });
});
