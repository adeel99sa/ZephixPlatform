import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';

import type { BaseStoreState, AsyncResult } from '../types/store';
import type { Organization, UserOrganization, CreateOrganizationData, InviteUserData } from '../types/organization';
import { createError } from '../types/store';
import { typedApi } from '@/lib/api';

interface OrganizationState extends BaseStoreState {
  organizations: Organization[];
  currentOrganization: Organization | null;
  userOrganizations: UserOrganization[];

  // Actions
  setCurrentOrganization: (organization: Organization) => void;
  setOrganizations: (organizations: Organization[]) => void;
  setUserOrganizations: (userOrganizations: UserOrganization[]) => void;

  // API Actions
  getUserOrganizations: () => Promise<AsyncResult<Organization[]>>;
  createOrganization: (data: CreateOrganizationData) => Promise<AsyncResult<Organization>>;
  updateOrganization: (id: string, data: Partial<CreateOrganizationData>) => Promise<AsyncResult<Organization>>;
  switchOrganization: (organizationId: string) => Promise<AsyncResult<Organization>>;
  inviteUser: (organizationId: string, data: InviteUserData) => Promise<AsyncResult<{ success: boolean; message: string }>>;
  removeUser: (organizationId: string, userId: string) => Promise<AsyncResult<void>>;
  updateUserRole: (organizationId: string, userId: string, role: 'admin' | 'pm' | 'viewer') => Promise<AsyncResult<void>>;
  clearError: () => void;
  clearSuccess: () => void;
}

// Real API functions using the same API client as workspace.api.ts
const organizationApi = {
  getUserOrganizations: async (): Promise<{ data: Organization[] }> => {
    try {
      const response = await typedApi.get<Organization[] | { data: Organization[] }>('/organizations');
      const organizations = Array.isArray(response) ? response : (response.data || []);
      return { data: organizations };
    } catch (error) {
      console.error('Failed to fetch user organizations:', error);
      throw error;
    }
  },

  createOrganization: async (data: CreateOrganizationData): Promise<{ data: Organization }> => {
    try {
      const response = await typedApi.post<Organization>('/organizations', data);
      return { data: response };
    } catch (error) {
      console.error('Failed to create organization:', error);
      throw error;
    }
  },

  switchOrganization: async (organizationId: string): Promise<{ data: Organization }> => {
    try {
      const response = await typedApi.get<Organization>(`/organizations/${organizationId}`);
      return { data: response };
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      throw error;
    }
  },

  inviteUser: async (organizationId: string, data: InviteUserData): Promise<{ data: { success: boolean; message: string } }> => {
    try {
      const response = await typedApi.post<{ success: boolean; message: string }>(`/organizations/${organizationId}/invite`, data);
      return { data: response };
    } catch (error) {
      console.error('Failed to invite user:', error);
      throw error;
    }
  },

  updateOrganization: async (id: string, data: Partial<CreateOrganizationData>): Promise<{ data: Organization }> => {
    try {
      const response = await typedApi.patch<Organization>(`/organizations/${id}`, data);
      return { data: response };
    } catch (error) {
      console.error('Failed to update organization:', error);
      throw error;
    }
  },
};

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set, get) => ({
      organizations: [],
      currentOrganization: null,
      userOrganizations: [],
      isLoading: false,
      loadingAction: undefined,
      loadingStartTime: undefined,
      error: null,
      errorTimestamp: undefined,
      lastSuccess: undefined,
      successTimestamp: undefined,

      // Basic state setters
      setCurrentOrganization: (organization) => {
        console.log(`🏢 OrganizationStore: Setting current organization to ${organization.name}`);
        set({
          currentOrganization: organization,
          error: null,
          errorTimestamp: undefined,
        });
      },

      setOrganizations: (organizations) => {
        console.log(`🏢 OrganizationStore: Setting ${organizations.length} organizations`);
        set({
          organizations,
          error: null,
          errorTimestamp: undefined,
        });
      },

      setUserOrganizations: (userOrganizations) => {
        console.log(`🏢 OrganizationStore: Setting ${userOrganizations.length} user organizations`);
        set({
          userOrganizations,
          error: null,
          errorTimestamp: undefined,
        });
      },

      // API Actions
      getUserOrganizations: async () => {
        const startTime = performance.now();
        const action = 'getUserOrganizations';

        console.log(`🏢 OrganizationStore: Starting ${action}`);

        set({
          isLoading: true,
          loadingAction: action,
          loadingStartTime: startTime,
          error: null
        });

        try {
          const response = await organizationApi.getUserOrganizations();
          const endTime = performance.now();

          console.log(`✅ OrganizationStore: ${action} completed in ${(endTime - startTime).toFixed(2)}ms`);

          set({
            organizations: response.data,
            currentOrganization: response.data[0] || null, // Set first org as current
            isLoading: false,
            loadingAction: undefined,
            loadingStartTime: undefined,
            lastSuccess: 'Organizations loaded successfully',
            successTimestamp: new Date().toISOString()
          });

          return {
            success: true,
            data: response.data
          };
        } catch (error) {
          const endTime = performance.now();
          const errorMessage = error instanceof Error ? error.message : 'Failed to load organizations';
          const storeError = createError('organization', errorMessage, {
            reason: 'fetch_failed',
            endpoint: '/organizations',
            method: 'GET'
          });

          console.error(`❌ OrganizationStore: ${action} failed after ${(endTime - startTime).toFixed(2)}ms`);
          console.error('OrganizationStore Error:', error);

          set({
            isLoading: false,
            loadingAction: undefined,
            loadingStartTime: undefined,
            error: storeError,
            errorTimestamp: new Date().toISOString()
          });

          return {
            success: false,
            error: storeError
          };
        }
      },

      createOrganization: async (data: CreateOrganizationData) => {
        const startTime = performance.now();
        const action = 'createOrganization';

        console.log(`🏢 OrganizationStore: Starting ${action} for ${data.name}`);

        set({
          isLoading: true,
          loadingAction: action,
          loadingStartTime: startTime,
          error: null
        });

        try {
          const response = await organizationApi.createOrganization(data);
          const endTime = performance.now();

          console.log(`✅ OrganizationStore: ${action} completed in ${(endTime - startTime).toFixed(2)}ms`);

          const currentOrgs = get().organizations;
          const newOrgs = [...currentOrgs, response.data];

          set({
            organizations: newOrgs,
            currentOrganization: response.data, // Switch to new organization
            isLoading: false,
            loadingAction: undefined,
            loadingStartTime: undefined,
            lastSuccess: `Organization "${response.data.name}" created successfully`,
            successTimestamp: new Date().toISOString()
          });

          toast.success(`Organization "${response.data.name}" created successfully`);

          return {
            success: true,
            data: response.data
          };
        } catch (error) {
          const endTime = performance.now();
          const errorMessage = error instanceof Error ? error.message : 'Failed to create organization';
          const storeError = createError('organization', errorMessage, {
            reason: 'creation_failed',
            endpoint: '/organizations',
            method: 'POST'
          });

          console.error(`❌ OrganizationStore: ${action} failed after ${(endTime - startTime).toFixed(2)}ms`);
          console.error('OrganizationStore Error:', error);

          set({
            isLoading: false,
            loadingAction: undefined,
            loadingStartTime: undefined,
            error: storeError,
            errorTimestamp: new Date().toISOString()
          });

          return {
            success: false,
            error: storeError
          };
        }
      },

      switchOrganization: async (organizationId: string) => {
        const startTime = performance.now();
        const action = 'switchOrganization';

        console.log(`🏢 OrganizationStore: Starting ${action} to ${organizationId}`);

        set({
          isLoading: true,
          loadingAction: action,
          loadingStartTime: startTime,
          error: null
        });

        try {
          const response = await organizationApi.switchOrganization(organizationId);
          const endTime = performance.now();

          console.log(`✅ OrganizationStore: ${action} completed in ${(endTime - startTime).toFixed(2)}ms`);

          set({
            currentOrganization: response.data,
            isLoading: false,
            loadingAction: undefined,
            loadingStartTime: undefined,
            lastSuccess: `Switched to ${response.data.name}`,
            successTimestamp: new Date().toISOString()
          });

          toast.success(`Switched to ${response.data.name}`);

          return {
            success: true,
            data: response.data
          };
        } catch (error) {
          const endTime = performance.now();
          const errorMessage = error instanceof Error ? error.message : 'Failed to switch organization';
          const storeError = createError('organization', errorMessage, {
            reason: 'switch_failed',
            endpoint: `/organizations/${organizationId}/switch`,
            method: 'POST'
          });

          console.error(`❌ OrganizationStore: ${action} failed after ${(endTime - startTime).toFixed(2)}ms`);
          console.error('OrganizationStore Error:', error);

          set({
            isLoading: false,
            loadingAction: undefined,
            loadingStartTime: undefined,
            error: storeError,
            errorTimestamp: new Date().toISOString()
          });

          return {
            success: false,
            error: storeError
          };
        }
      },

      updateOrganization: async (id: string, data: Partial<CreateOrganizationData>) => {
        const action = 'updateOrganization';

        set({
          isLoading: true,
          loadingAction: action,
          error: null
        });

        try {
          const response = await organizationApi.updateOrganization(id, data);
          const updatedOrg = response.data;

          const organizations = get().organizations;
          const updatedOrgs = organizations.map(org =>
            org.id === id ? updatedOrg : org
          );

          set({
            organizations: updatedOrgs,
            currentOrganization: get().currentOrganization?.id === id ? updatedOrg : get().currentOrganization,
            isLoading: false,
            loadingAction: undefined,
            lastSuccess: 'Organization updated successfully',
            successTimestamp: new Date().toISOString()
          });

          toast.success('Organization updated successfully');

          return {
            success: true as const,
            data: updatedOrg
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update organization';
          const storeError = createError('organization', errorMessage, {
            reason: 'update_failed',
            endpoint: `/organizations/${id}`,
            method: 'PATCH'
          });

          set({
            isLoading: false,
            loadingAction: undefined,
            error: storeError,
            errorTimestamp: new Date().toISOString()
          });

          return {
            success: false,
            error: storeError
          };
        }
      },

      inviteUser: async (organizationId: string, data: InviteUserData) => {
        const action = 'inviteUser';

        set({
          isLoading: true,
          loadingAction: action,
          error: null
        });

        try {
          const response = await organizationApi.inviteUser(organizationId, data);

          set({
            isLoading: false,
            loadingAction: undefined,
            lastSuccess: response.data.message,
            successTimestamp: new Date().toISOString()
          });

          toast.success(response.data.message);

          return {
            success: true,
            data: response.data
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to invite user';
          const storeError = createError('organization', errorMessage, {
            reason: 'invite_failed',
            endpoint: `/organizations/${organizationId}/invite`,
            method: 'POST'
          });

          set({
            isLoading: false,
            loadingAction: undefined,
            error: storeError,
            errorTimestamp: new Date().toISOString()
          });

          return {
            success: false,
            error: storeError
          };
        }
      },

      removeUser: async (organizationId: string, userId: string) => {
        const action = 'removeUser';

        set({
          isLoading: true,
          loadingAction: action,
          error: null
        });

        try {
          await typedApi.delete(`/organizations/${organizationId}/users/${userId}`);

          set({
            isLoading: false,
            loadingAction: undefined,
            lastSuccess: 'User removed successfully',
            successTimestamp: new Date().toISOString()
          });

          toast.success('User removed successfully');

          return {
            success: true
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to remove user';
          const storeError = createError('organization', errorMessage, {
            reason: 'remove_failed',
            endpoint: `/organizations/${organizationId}/users/${userId}`,
            method: 'DELETE'
          });

          set({
            isLoading: false,
            loadingAction: undefined,
            error: storeError,
            errorTimestamp: new Date().toISOString()
          });

          return {
            success: false,
            error: storeError
          };
        }
      },

      updateUserRole: async (organizationId: string, userId: string, role: 'admin' | 'pm' | 'viewer') => {
        const action = 'updateUserRole';

        set({
          isLoading: true,
          loadingAction: action,
          error: null
        });

        try {
          await typedApi.put(`/organizations/${organizationId}/team/members/${userId}/role`, { role });

          set({
            isLoading: false,
            loadingAction: undefined,
            lastSuccess: `User role updated to ${role}`,
            successTimestamp: new Date().toISOString()
          });

          toast.success(`User role updated to ${role}`);

          return {
            success: true
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update user role';
          const storeError = createError('organization', errorMessage, {
            reason: 'role_update_failed',
            endpoint: `/organizations/${organizationId}/team/members/${userId}/role`,
            method: 'PUT'
          });

          set({
            isLoading: false,
            loadingAction: undefined,
            error: storeError,
            errorTimestamp: new Date().toISOString()
          });

          return {
            success: false,
            error: storeError
          };
        }
      },

      clearError: () => {
        console.log('🧹 OrganizationStore: Clearing error state');
        set({
          error: null,
          errorTimestamp: undefined
        });
      },

      clearSuccess: () => {
        console.log('🧹 OrganizationStore: Clearing success state');
        set({
          lastSuccess: undefined,
          successTimestamp: undefined
        });
      },
    }),
    {
      name: 'zephix-organization',
      partialize: (state) => ({
        currentOrganization: state.currentOrganization,
        organizations: state.organizations,
      }),
    }
  )
);
