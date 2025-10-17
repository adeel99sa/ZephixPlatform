import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/ui/layout/PageHeader';
import { Button } from '../../components/ui/button/Button';
import { Input } from '../../components/ui/input/Input';
import { Select } from '../../components/ui/form/Select';
import { Switch } from '../../components/ui/form/Switch';
import { Textarea } from '../../components/ui/form/Textarea';
import { FormField } from '../../components/ui/form/FormField';
import { FormGroup } from '../../components/ui/form/FormGroup';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/overlay/Tabs';
import { ErrorBanner } from '../../components/ui/feedback/ErrorBanner';
import { apiClient } from '../../lib/api/client';

interface OrganizationSettings {
  id: string;
  name: string;
  domain: string;
  timezone: string;
  language: string;
  dateFormat: string;
  currency: string;
  organizationId: string;
}

interface UserSettings {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
  language: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  theme: 'light' | 'dark' | 'system';
  organizationId: string;
}

interface SecuritySettings {
  id: string;
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordPolicy: string;
  ipWhitelist: string[];
  organizationId: string;
}

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
];

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
];

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const PASSWORD_POLICIES = [
  { value: 'basic', label: 'Basic (8+ characters)' },
  { value: 'strong', label: 'Strong (12+ chars, mixed case, numbers)' },
  { value: 'enterprise', label: 'Enterprise (12+ chars, mixed case, numbers, symbols)' },
];

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('organization');
  const queryClient = useQueryClient();

  // Fetch organization settings
  const {
    data: organizationData,
    isLoading: orgLoading,
    error: orgError,
  } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: async () => {
      const response = await apiClient.get<OrganizationSettings>('/api/settings/organization');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user settings
  const {
    data: userData,
    isLoading: userLoading,
    error: userError,
  } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const response = await apiClient.get<UserSettings>('/api/settings/user');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch security settings
  const {
    data: securityData,
    isLoading: securityLoading,
    error: securityError,
  } = useQuery({
    queryKey: ['security-settings'],
    queryFn: async () => {
      const response = await apiClient.get<SecuritySettings>('/api/settings/security');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Update organization settings mutation
  const updateOrgMutation = useMutation({
    mutationFn: async (settings: Partial<OrganizationSettings>) => {
      const response = await apiClient.patch('/api/settings/organization', settings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
    },
  });

  // Update user settings mutation
  const updateUserMutation = useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      const response = await apiClient.patch('/api/settings/user', settings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    },
  });

  // Update security settings mutation
  const updateSecurityMutation = useMutation({
    mutationFn: async (settings: Partial<SecuritySettings>) => {
      const response = await apiClient.patch('/api/settings/security', settings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-settings'] });
    },
  });

  const isLoading = orgLoading || userLoading || securityLoading;
  const error = orgError || userError || securityError;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader title="Settings" description="Manage your account and organization settings" />
        <div className="mt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Settings"
        description="Manage your account and organization settings"
      />

      {error && (
        <ErrorBanner
          description={error.message || 'Failed to load settings'}
          onRetry={() => {
            queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            queryClient.invalidateQueries({ queryKey: ['security-settings'] });
          }}
          retryLabel="Retry"
        />
      )}

      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="organization" className="mt-6">
            <OrganizationSettingsTab
              settings={organizationData}
              onSave={updateOrgMutation.mutate}
              isSaving={updateOrgMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="account" className="mt-6">
            <AccountSettingsTab
              settings={userData}
              onSave={updateUserMutation.mutate}
              isSaving={updateUserMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <SecuritySettingsTab
              settings={securityData}
              onSave={updateSecurityMutation.mutate}
              isSaving={updateSecurityMutation.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Organization Settings Tab Component
const OrganizationSettingsTab: React.FC<{
  settings?: OrganizationSettings;
  onSave: (settings: Partial<OrganizationSettings>) => void;
  isSaving: boolean;
}> = ({ settings, onSave, isSaving }) => {
  const [formData, setFormData] = useState({
    name: settings?.name || '',
    domain: settings?.domain || '',
    timezone: settings?.timezone || 'UTC',
    language: settings?.language || 'en',
    dateFormat: settings?.dateFormat || 'MM/DD/YYYY',
    currency: settings?.currency || 'USD',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormGroup legend="Organization Information">
        <FormField label="Organization Name" required>
          <Input
            id="org-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </FormField>

        <FormField label="Domain" help="Your organization's primary domain">
          <Input
            id="org-domain"
            value={formData.domain}
            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            placeholder="example.com"
          />
        </FormField>
      </FormGroup>

      <FormGroup legend="Regional Settings">
        <FormField label="Timezone">
          <Select
            id="timezone"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            options={TIMEZONES}
          />
        </FormField>

        <FormField label="Language">
          <Select
            id="language"
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            options={LANGUAGES}
          />
        </FormField>

        <FormField label="Date Format">
          <Select
            id="date-format"
            value={formData.dateFormat}
            onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value })}
            options={DATE_FORMATS}
          />
        </FormField>

        <FormField label="Currency">
          <Select
            id="currency"
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            options={CURRENCIES}
          />
        </FormField>
      </FormGroup>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Organization Settings'}
        </Button>
      </div>
    </form>
  );
};

// Account Settings Tab Component
const AccountSettingsTab: React.FC<{
  settings?: UserSettings;
  onSave: (settings: Partial<UserSettings>) => void;
  isSaving: boolean;
}> = ({ settings, onSave, isSaving }) => {
  const [formData, setFormData] = useState({
    firstName: settings?.firstName || '',
    lastName: settings?.lastName || '',
    email: settings?.email || '',
    timezone: settings?.timezone || 'UTC',
    language: settings?.language || 'en',
    theme: settings?.theme || 'light',
    emailNotifications: settings?.emailNotifications ?? true,
    pushNotifications: settings?.pushNotifications ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormGroup legend="Personal Information">
        <FormField label="First Name" required>
          <Input
            id="first-name"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </FormField>

        <FormField label="Last Name" required>
          <Input
            id="last-name"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </FormField>

        <FormField label="Email Address" required>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </FormField>
      </FormGroup>

      <FormGroup legend="Preferences">
        <FormField label="Timezone">
          <Select
            id="user-timezone"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            options={TIMEZONES}
          />
        </FormField>

        <FormField label="Language">
          <Select
            id="user-language"
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            options={LANGUAGES}
          />
        </FormField>

        <FormField label="Theme">
          <Select
            id="theme"
            value={formData.theme}
            onChange={(e) => setFormData({ ...formData, theme: e.target.value as 'light' | 'dark' | 'system' })}
            options={THEMES}
          />
        </FormField>
      </FormGroup>

      <FormGroup legend="Notifications">
        <FormField>
          <Switch
            id="email-notifications"
            checked={formData.emailNotifications}
            onCheckedChange={(checked) => setFormData({ ...formData, emailNotifications: checked })}
            label="Email Notifications"
            help="Receive notifications via email"
          />
        </FormField>

        <FormField>
          <Switch
            id="push-notifications"
            checked={formData.pushNotifications}
            onCheckedChange={(checked) => setFormData({ ...formData, pushNotifications: checked })}
            label="Push Notifications"
            help="Receive push notifications in your browser"
          />
        </FormField>
      </FormGroup>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Account Settings'}
        </Button>
      </div>
    </form>
  );
};

// Security Settings Tab Component
const SecuritySettingsTab: React.FC<{
  settings?: SecuritySettings;
  onSave: (settings: Partial<SecuritySettings>) => void;
  isSaving: boolean;
}> = ({ settings, onSave, isSaving }) => {
  const [formData, setFormData] = useState({
    twoFactorEnabled: settings?.twoFactorEnabled ?? false,
    sessionTimeout: settings?.sessionTimeout || 30,
    passwordPolicy: settings?.passwordPolicy || 'basic',
    ipWhitelist: settings?.ipWhitelist?.join('\n') || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      ipWhitelist: formData.ipWhitelist.split('\n').filter(ip => ip.trim()),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormGroup legend="Authentication">
        <FormField>
          <Switch
            id="two-factor"
            checked={formData.twoFactorEnabled}
            onCheckedChange={(checked) => setFormData({ ...formData, twoFactorEnabled: checked })}
            label="Two-Factor Authentication"
            help="Add an extra layer of security to your account"
          />
        </FormField>

        <FormField label="Session Timeout (minutes)">
          <Input
            id="session-timeout"
            type="number"
            min="5"
            max="480"
            value={formData.sessionTimeout}
            onChange={(e) => setFormData({ ...formData, sessionTimeout: parseInt(e.target.value) })}
            help="How long to keep users logged in (5-480 minutes)"
          />
        </FormField>
      </FormGroup>

      <FormGroup legend="Password Policy">
        <FormField label="Password Requirements">
          <Select
            id="password-policy"
            value={formData.passwordPolicy}
            onChange={(e) => setFormData({ ...formData, passwordPolicy: e.target.value })}
            options={PASSWORD_POLICIES}
          />
        </FormField>
      </FormGroup>

      <FormGroup legend="IP Whitelist">
        <FormField label="Allowed IP Addresses" help="One IP address per line">
          <Textarea
            id="ip-whitelist"
            value={formData.ipWhitelist}
            onChange={(e) => setFormData({ ...formData, ipWhitelist: e.target.value })}
            placeholder="192.168.1.1&#10;10.0.0.1"
            rows={4}
          />
        </FormField>
      </FormGroup>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Security Settings'}
        </Button>
      </div>
    </form>
  );
};