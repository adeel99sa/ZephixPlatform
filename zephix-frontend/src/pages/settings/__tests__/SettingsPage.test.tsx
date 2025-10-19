import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsPage } from '../SettingsPage';

// Mock the API client
vi.mock('../../../lib/api/client', () => ({
  default: (await import('../../../test/mocks/apiClient.mock')).default
}));

import apiClient from '../../../lib/api/client';

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
  ipWhitelist: [],
  organizationId: 'org-1',
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and tabs', () => {
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
    expect(screen.getByText('Manage your account and organization settings')).toBeInTheDocument();
    expect(screen.getByText('Organization')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    apiClient.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithQueryClient(<SettingsPage />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
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
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/domain/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
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
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
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
      expect(screen.getByLabelText(/two-factor authentication/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/session timeout/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password requirements/i)).toBeInTheDocument();
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
        name: 'Test Organization',
        domain: 'test.com',
        timezone: 'UTC',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
      });
    });
  });

  it('shows error banner when API fails', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('API Error'));

    renderWithQueryClient(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load settings')).toBeInTheDocument();
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
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
    });

    const orgNameInput = screen.getByLabelText(/organization name/i);
    expect(orgNameInput).toHaveAttribute('required');
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
    expect(accountTab).toHaveAttribute('data-state', 'active');
  });
});
