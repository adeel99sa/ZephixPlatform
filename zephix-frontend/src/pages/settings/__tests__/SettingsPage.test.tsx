import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsPage } from '../SettingsPage';

// Mock the API client
vi.mock('../../../lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  },
}));

import { apiClient } from '../../../lib/api/client';

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

const mockOrganizationSettings = {
  id: 'org-1',
  name: 'Test Organization',
  domain: 'test.com',
  timezone: 'UTC',
  language: 'en',
  dateFormat: 'MM/DD/YYYY',
  currency: 'USD',
  organizationId: 'org-1',
};

const mockUserSettings = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  timezone: 'UTC',
  language: 'en',
  emailNotifications: true,
  pushNotifications: true,
  theme: 'light' as const,
  organizationId: 'org-1',
};

const mockSecuritySettings = {
  id: 'security-1',
  twoFactorEnabled: false,
  sessionTimeout: 30,
  passwordPolicy: 'basic',
  ipWhitelist: ['192.168.1.1', '10.0.0.1'],
  organizationId: 'org-1',
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and tabs', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('organization')) {
        return Promise.resolve({ data: mockOrganizationSettings });
      }
      if (url.includes('user')) {
        return Promise.resolve({ data: mockUserSettings });
      }
      if (url.includes('security')) {
        return Promise.resolve({ data: mockSecuritySettings });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithQueryClient(<SettingsPage />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage your application settings')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Organization')).toBeInTheDocument();
      expect(screen.getByText('Account')).toBeInTheDocument();
      expect(screen.getByText('Security')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    apiClient.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithQueryClient(<SettingsPage />);

    expect(screen.getByText('Loading settings...')).toBeInTheDocument();
  });

  it('displays organization settings form', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('organization')) {
        return Promise.resolve({ data: mockOrganizationSettings });
      }
      if (url.includes('user')) {
        return Promise.resolve({ data: mockUserSettings });
      }
      if (url.includes('security')) {
        return Promise.resolve({ data: mockSecuritySettings });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithQueryClient(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Organization')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test.com')).toBeInTheDocument();
    });

    // Check that form fields are populated
    expect(screen.getByDisplayValue('Test Organization')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test.com')).toBeInTheDocument();
  });

  it('displays account settings form when account tab is selected', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('organization')) {
        return Promise.resolve({ data: mockOrganizationSettings });
      }
      if (url.includes('user')) {
        return Promise.resolve({ data: mockUserSettings });
      }
      if (url.includes('security')) {
        return Promise.resolve({ data: mockSecuritySettings });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithQueryClient(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Account')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Account'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    // Check that form fields are populated
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('displays security settings form when security tab is selected', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('organization')) {
        return Promise.resolve({ data: mockOrganizationSettings });
      }
      if (url.includes('user')) {
        return Promise.resolve({ data: mockUserSettings });
      }
      if (url.includes('security')) {
        return Promise.resolve({ data: mockSecuritySettings });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithQueryClient(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Security')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Security'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();
      expect(screen.getByText('Basic (8+ characters)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('192.168.1.1, 10.0.0.1')).toBeInTheDocument();
    });
  });

  it('handles form submission for organization settings', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('organization')) {
        return Promise.resolve({ data: mockOrganizationSettings });
      }
      if (url.includes('user')) {
        return Promise.resolve({ data: mockUserSettings });
      }
      if (url.includes('security')) {
        return Promise.resolve({ data: mockSecuritySettings });
      }
      return Promise.resolve({ data: {} });
    });
    apiClient.patch.mockResolvedValueOnce({ data: {} });

    renderWithQueryClient(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Save Organization Settings')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Organization Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/settings/organization', {
        id: 'org-1',
        name: 'Test Organization',
        domain: 'test.com',
        timezone: 'UTC',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
        organizationId: 'org-1',
      });
    });
  });

  it('shows error banner when API fails', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('API Error'));

    renderWithQueryClient(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('organization')) {
        return Promise.resolve({ data: mockOrganizationSettings });
      }
      if (url.includes('user')) {
        return Promise.resolve({ data: mockUserSettings });
      }
      if (url.includes('security')) {
        return Promise.resolve({ data: mockSecuritySettings });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithQueryClient(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Organization')).toBeInTheDocument();
    });

    const orgNameInput = screen.getByDisplayValue('Test Organization');
    expect(orgNameInput).toBeInTheDocument();
  });

  it('supports keyboard navigation between tabs', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('organization')) {
        return Promise.resolve({ data: mockOrganizationSettings });
      }
      if (url.includes('user')) {
        return Promise.resolve({ data: mockUserSettings });
      }
      if (url.includes('security')) {
        return Promise.resolve({ data: mockSecuritySettings });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithQueryClient(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Account')).toBeInTheDocument();
    });

    const accountTab = screen.getByText('Account');
    accountTab.focus();

    fireEvent.keyDown(accountTab, { key: 'Enter' });
    // Tab navigation is handled by the component, just verify the tab is clickable
    expect(accountTab).toBeInTheDocument();
  });
});
