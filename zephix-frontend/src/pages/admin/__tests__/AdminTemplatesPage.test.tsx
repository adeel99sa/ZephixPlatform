import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminTemplatesPage from '../AdminTemplatesPage';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
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

describe('AdminTemplatesPage', () => {
  const mockTemplates = [
    {
      id: '1',
      name: 'Web App Development',
      description: 'Standard agile web application project template',
      methodology: 'agile',
      isActive: true,
      isSystem: false,
      isDefault: false,
      isPublished: false,
      deliveryMethod: 'SCRUM',
      boundKpiCount: 3,
      defaultTabs: ['overview', 'tasks', 'board'],
    },
    {
      id: '2',
      name: 'Marketing Campaign',
      description: 'Marketing campaign template',
      methodology: 'waterfall',
      isActive: true,
      isSystem: true,
      isDefault: true,
      isPublished: true,
      deliveryMethod: 'WATERFALL',
      boundKpiCount: 4,
      defaultTabs: ['overview', 'gantt', 'budget'],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list from API', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockTemplates });
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Web App Development')).toBeInTheDocument();
      expect(screen.getByText('Marketing Campaign')).toBeInTheDocument();
    });
  });

  it('handles empty state', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('No templates found')).toBeInTheDocument();
    });
  });

  it('shows Clone button on system templates', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockTemplates });
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Clone')).toBeInTheDocument();
    });
  });

  it('shows Edit button on org templates (not system)', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockTemplates });
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('shows Published badge on published templates', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockTemplates });
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Published')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });

  it('shows Publish button on unpublished org templates', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockTemplates });
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Publish')).toBeInTheDocument();
    });
  });

  it('calls clone endpoint when Clone clicked', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: mockTemplates })
      .mockResolvedValueOnce({ data: mockTemplates });
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Clone')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Clone'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/admin/templates/2/clone');
    });
  });

  it('calls publish endpoint when Publish clicked', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: mockTemplates })
      .mockResolvedValueOnce({ data: mockTemplates });
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Publish')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Publish'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/admin/templates/1/publish');
    });
  });

  it('shows delivery method badge', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockTemplates });
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Scrum')).toBeInTheDocument();
      expect(screen.getByText('Waterfall')).toBeInTheDocument();
    });
  });

  it('shows KPI count badge', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockTemplates });
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('3 KPIs')).toBeInTheDocument();
      expect(screen.getByText('4 KPIs')).toBeInTheDocument();
    });
  });

  it('opens edit modal with delivery method and tabs', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockTemplates });
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit'));

    await waitFor(() => {
      expect(screen.getByText('Edit Template')).toBeInTheDocument();
      expect(screen.getByText('Delivery Method')).toBeInTheDocument();
      expect(screen.getByText('Default Tabs')).toBeInTheDocument();
      expect(screen.getByText('Governance Flags')).toBeInTheDocument();
    });
  });

  it('hides admin controls for non-admin users', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockTemplates });
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'member', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.queryByText('Create Template')).not.toBeInTheDocument();
      expect(screen.queryByText('Clone')).not.toBeInTheDocument();
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });
  });

  it('shows loading state', async () => {
    const { useAuth } = await import('@/state/AuthContext');
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);
    expect(screen.getByText('Loading templates...')).toBeInTheDocument();
  });

  it('shows error state and retry button', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('API Error'));
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });
});
