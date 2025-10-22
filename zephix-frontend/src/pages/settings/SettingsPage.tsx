import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '../../components/ui/layout/PageHeader';
import { Button } from '../../components/ui/button/Button';
import { Input } from '../../components/ui/input/Input';
import { Select, SelectOption } from '../../components/ui/form/Select';
import { Switch } from '../../components/ui/form/Switch';
import { Textarea } from '../../components/ui/form/Textarea';
import { FormField } from '../../components/ui/form/FormField';
import { FormGroup } from '../../components/ui/form/FormGroup';
import { Tabs, TabItem } from '../../components/ui/overlay/Tabs';
import { ErrorBanner } from '../../components/ui/feedback/ErrorBanner';
import { apiClient } from '../../lib/api/client';
import { getErrorText } from '../../lib/api/errors';
import { useUIStore } from '../../stores/uiStore';

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

const TIMEZONE_OPTIONS: SelectOption[] = [
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
  { value: 'America/New_York', label: 'Eastern Time (America/New_York)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (America/Los_Angeles)' },
];

const LANGUAGE_OPTIONS: SelectOption[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
];

const DATE_FORMAT_OPTIONS: SelectOption[] = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

const CURRENCY_OPTIONS: SelectOption[] = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

const PASSWORD_POLICY_OPTIONS: SelectOption[] = [
  { value: 'basic', label: 'Basic (8+ characters)' },
  { value: 'strong', label: 'Strong (12+ chars, mixed case, numbers)' },
  { value: 'enterprise', label: 'Enterprise (12+ chars, mixed case, numbers, symbols)' },
];

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  // Feature flags for settings sections
  const features = { 
    hasOrgProfile: true, 
    hasUserSettings: true, 
    hasSecurity: false // Disable until backend endpoint is ready
  };

  // Fetch organization settings
  const {
    data: organizationData,
    isLoading: orgLoading,
    error: orgError,
    refetch: refetchOrg,
  } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: async () => {
      const response = await apiClient.get<OrganizationSettings>('/admin/profile');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user settings
  const {
    data: userData,
    isLoading: userLoading,
    error: userError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const response = await apiClient.get<UserSettings>('/users/me');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch security settings
  const {
    data: securityData,
    isLoading: securityLoading,
    error: securityError,
    refetch: refetchSecurity,
  } = useQuery({
    queryKey: ['security-settings'],
    queryFn: async () => {
      const response = await apiClient.get<SecuritySettings>('/admin/security');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Update organization settings mutation
  const updateOrgMutation = useMutation({
    mutationFn: async (settings: Partial<OrganizationSettings>) => {
      const response = await apiClient.patch('/admin/profile', settings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      addToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'Organization settings have been updated successfully.',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: error.message || 'Failed to save organization settings.',
      });
    },
  });

  // Update user settings mutation
  const updateUserMutation = useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      const response = await apiClient.patch('/users/me', settings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      addToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'Account settings have been updated successfully.',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: error.message || 'Failed to save account settings.',
      });
    },
  });

  // Update security settings mutation
  const updateSecurityMutation = useMutation({
    mutationFn: async (settings: Partial<SecuritySettings>) => {
      const response = await apiClient.patch('/admin/security', settings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-settings'] });
      addToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'Security settings have been updated successfully.',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: error.message || 'Failed to save security settings.',
      });
    },
  });

  const isLoading = orgLoading || userLoading || securityLoading;
  const error = orgError || userError || securityError;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader title="Settings" description="Manage your application settings" />
        <div className="mt-6 text-center text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader title="Settings" description="Manage your application settings" />
        <ErrorBanner
          description={getErrorText(error)}
          onRetry={() => { refetchOrg(); refetchUser(); refetchSecurity(); }}
          retryLabel="Retry"
        />
      </div>
    );
  }

  const organizationSettings = organizationData || {
    id: '', name: '', domain: '', timezone: 'UTC', language: 'en', dateFormat: 'MM/DD/YYYY', currency: 'USD', organizationId: ''
  };
  const userSettings = userData || {
    id: '', email: '', firstName: '', lastName: '', timezone: 'UTC', language: 'en', emailNotifications: false, pushNotifications: false, theme: 'system', organizationId: ''
  };
  const securitySettings = securityData || {
    id: '', twoFactorEnabled: false, sessionTimeout: 30, passwordPolicy: 'basic', ipWhitelist: [], organizationId: ''
  };

  const tabItems: TabItem[] = [
    ...(features.hasOrgProfile ? [{
      id: 'organization',
      label: 'Organization',
      content: (
        <form onSubmit={(e) => {
          e.preventDefault();
          updateOrgMutation.mutate(organizationSettings);
        }}>
          <FormGroup legend="Organization Profile" description="Update your organization's public profile information.">
            <FormField label="Organization Name" htmlFor="orgName">
              <Input
                id="orgName"
                value={organizationSettings.name}
                onChange={(e) => updateOrgMutation.mutate({ name: e.target.value })}
                disabled={updateOrgMutation.isPending}
              />
            </FormField>
            <FormField label="Domain" htmlFor="orgDomain" help="Your organization's primary domain.">
              <Input
                id="orgDomain"
                value={organizationSettings.domain}
                onChange={(e) => updateOrgMutation.mutate({ domain: e.target.value })}
                disabled={updateOrgMutation.isPending}
              />
            </FormField>
          </FormGroup>

          <FormGroup legend="Regional Settings" description="Configure timezone, language, and currency for your organization.">
            <FormField label="Timezone" htmlFor="orgTimezone">
              <Select
                id="orgTimezone"
                options={TIMEZONE_OPTIONS}
                value={organizationSettings.timezone}
                onChange={(e) => updateOrgMutation.mutate({ timezone: e.target.value })}
                disabled={updateOrgMutation.isPending}
              />
            </FormField>
            <FormField label="Language" htmlFor="orgLanguage">
              <Select
                id="orgLanguage"
                options={LANGUAGE_OPTIONS}
                value={organizationSettings.language}
                onChange={(e) => updateOrgMutation.mutate({ language: e.target.value })}
                disabled={updateOrgMutation.isPending}
              />
            </FormField>
            <FormField label="Date Format" htmlFor="orgDateFormat">
              <Select
                id="orgDateFormat"
                options={DATE_FORMAT_OPTIONS}
                value={organizationSettings.dateFormat}
                onChange={(e) => updateOrgMutation.mutate({ dateFormat: e.target.value })}
                disabled={updateOrgMutation.isPending}
              />
            </FormField>
            <FormField label="Currency" htmlFor="orgCurrency">
              <Select
                id="orgCurrency"
                options={CURRENCY_OPTIONS}
                value={organizationSettings.currency}
                onChange={(e) => updateOrgMutation.mutate({ currency: e.target.value })}
                disabled={updateOrgMutation.isPending}
              />
            </FormField>
          </FormGroup>
          <Button type="submit" disabled={updateOrgMutation.isPending} loading={updateOrgMutation.isPending}>
            Save Organization Settings
          </Button>
        </form>
      ),
    }] : []),
    ...(features.hasUserSettings ? [{
      id: 'account',
      label: 'Account',
      content: (
        <form onSubmit={(e) => {
          e.preventDefault();
          updateUserMutation.mutate(userSettings);
        }}>
          <FormGroup legend="Personal Information" description="Update your personal details.">
            <FormField label="First Name" htmlFor="userFirstName">
              <Input
                id="userFirstName"
                value={userSettings.firstName}
                onChange={(e) => updateUserMutation.mutate({ firstName: e.target.value })}
                disabled={updateUserMutation.isPending}
              />
            </FormField>
            <FormField label="Last Name" htmlFor="userLastName">
              <Input
                id="userLastName"
                value={userSettings.lastName}
                onChange={(e) => updateUserMutation.mutate({ lastName: e.target.value })}
                disabled={updateUserMutation.isPending}
              />
            </FormField>
            <FormField label="Email" htmlFor="userEmail" help="Your primary email address.">
              <Input
                id="userEmail"
                type="email"
                value={userSettings.email}
                disabled
              />
            </FormField>
          </FormGroup>

          <FormGroup legend="Preferences" description="Manage your display and notification preferences.">
            <FormField label="Timezone" htmlFor="userTimezone">
              <Select
                id="userTimezone"
                options={TIMEZONE_OPTIONS}
                value={userSettings.timezone}
                onChange={(e) => updateUserMutation.mutate({ timezone: e.target.value })}
                disabled={updateUserMutation.isPending}
              />
            </FormField>
            <FormField label="Language" htmlFor="userLanguage">
              <Select
                id="userLanguage"
                options={LANGUAGE_OPTIONS}
                value={userSettings.language}
                onChange={(e) => updateUserMutation.mutate({ language: e.target.value })}
                disabled={updateUserMutation.isPending}
              />
            </FormField>
            <FormField label="Email Notifications" htmlFor="emailNotifications">
              <Switch
                id="emailNotifications"
                checked={userSettings.emailNotifications}
                onCheckedChange={(checked) => updateUserMutation.mutate({ emailNotifications: checked })}
                disabled={updateUserMutation.isPending}
              />
            </FormField>
            <FormField label="Push Notifications" htmlFor="pushNotifications">
              <Switch
                id="pushNotifications"
                checked={userSettings.pushNotifications}
                onCheckedChange={(checked) => updateUserMutation.mutate({ pushNotifications: checked })}
                disabled={updateUserMutation.isPending}
              />
            </FormField>
            <FormField label="Theme" htmlFor="userTheme">
              <Select
                id="userTheme"
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ]}
                value={userSettings.theme}
                onChange={(e) => updateUserMutation.mutate({ theme: e.target.value as 'light' | 'dark' | 'system' })}
                disabled={updateUserMutation.isPending}
              />
            </FormField>
          </FormGroup>
          <Button type="submit" disabled={updateUserMutation.isPending} loading={updateUserMutation.isPending}>
            Save Account Settings
          </Button>
        </form>
      ),
    }] : []),
    ...(features.hasSecurity ? [{
      id: 'security',
      label: 'Security',
      content: (
        <form onSubmit={(e) => {
          e.preventDefault();
          updateSecurityMutation.mutate(securitySettings);
        }}>
          <FormGroup legend="Authentication" description="Manage your account's security settings.">
            <FormField label="Two-Factor Authentication" htmlFor="twoFactorEnabled">
              <Switch
                id="twoFactorEnabled"
                checked={securitySettings.twoFactorEnabled}
                onCheckedChange={(checked) => updateSecurityMutation.mutate({ twoFactorEnabled: checked })}
                disabled={updateSecurityMutation.isPending}
              />
            </FormField>
            <FormField label="Session Timeout (minutes)" htmlFor="sessionTimeout">
              <Input
                id="sessionTimeout"
                type="number"
                value={securitySettings.sessionTimeout}
                onChange={(e) => updateSecurityMutation.mutate({ sessionTimeout: parseInt(e.target.value) })}
                disabled={updateSecurityMutation.isPending}
              />
            </FormField>
            <FormField label="Password Policy" htmlFor="passwordPolicy">
              <Select
                id="passwordPolicy"
                options={PASSWORD_POLICY_OPTIONS}
                value={securitySettings.passwordPolicy}
                onChange={(e) => updateSecurityMutation.mutate({ passwordPolicy: e.target.value })}
                disabled={updateSecurityMutation.isPending}
              />
            </FormField>
          </FormGroup>

          <FormGroup legend="Network Access" description="Control access to your organization's account.">
            <FormField label="IP Whitelist" htmlFor="ipWhitelist" help="Comma-separated list of allowed IP addresses.">
              <Textarea
                id="ipWhitelist"
                value={securitySettings.ipWhitelist.join(', ')}
                onChange={(e) => updateSecurityMutation.mutate({ ipWhitelist: e.target.value.split(',').map(ip => ip.trim()) })}
                disabled={updateSecurityMutation.isPending}
              />
            </FormField>
          </FormGroup>
          <Button type="submit" disabled={updateSecurityMutation.isPending} loading={updateSecurityMutation.isPending}>
            Save Security Settings
          </Button>
        </form>
      ),
    }] : []),
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader title="Settings" description="Manage your application settings" />

      <div className="mt-6">
        <Tabs items={tabItems} defaultActiveTab="organization" />
      </div>
    </div>
  );
};

export default SettingsPage;