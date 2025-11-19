import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminTemplatesPage from '../AdminTemplatesPage';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock toast
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
      taskTemplates: [
        { name: 'Setup project repository', estimatedHours: 8, phaseOrder: 0 },
      ],
    },
    {
      id: '2',
      name: 'Marketing Campaign',
      description: 'Marketing campaign template',
      methodology: 'waterfall',
      isActive: true,
      isSystem: true,
      isDefault: true,
      taskTemplates: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list from API', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: mockTemplates,
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Web App Development')).toBeInTheDocument();
      expect(screen.getByText('Marketing Campaign')).toBeInTheDocument();
      expect(screen.getByText('Standard agile web application project template')).toBeInTheDocument();
    });
  });

  it('handles empty state', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: [],
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('No templates found')).toBeInTheDocument();
    });
  });

  it('shows create button for admin', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: mockTemplates,
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Create Template')).toBeInTheDocument();
    });
  });

  it('hides create button for non-admin', async () => {
    const { apiClient } = await import('@/lib/api/client');
    const { useAuth } = await import('@/state/AuthContext');

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: mockTemplates,
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'member', organizationId: 'org1' },
      isAuthenticated: true,
    } as any);

    renderWithQueryClient(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.queryByText('Create Template')).not.toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    const { useAuth } = require('@/state/AuthContext');

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

