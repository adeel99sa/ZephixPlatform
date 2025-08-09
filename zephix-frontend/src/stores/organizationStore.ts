import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BaseStoreState, AsyncResult } from '../types/store';
import type { Organization, UserOrganization, CreateOrganizationData, InviteUserData } from '../types/organization';
import { createError } from '../types/store';
import { toast } from 'sonner';

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

// Mock API functions - these would be replaced with real API calls
const organizationApi = {
  getUserOrganizations: async (): Promise<{ data: Organization[] }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      data: [
        {
          id: '1',
          name: 'Acme Corporation',
          slug: 'acme-corp',
          status: 'active' as const,
          description: 'Leading provider of enterprise solutions',
          industry: 'Technology',
          size: 'large' as const,
          settings: { timezone: 'UTC', currency: 'USD' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
        {
          id: '2',
          name: 'StartupXYZ',
          slug: 'startupxyz',
          status: 'trial' as const,
          description: 'Innovative startup disrupting the market',
          industry: 'Technology',
          size: 'startup' as const,
          trialEndsAt: '2024-03-01T00:00:00Z',
          settings: { timezone: 'UTC', currency: 'USD' },
          createdAt: '2024-02-01T00:00:00Z',
          updatedAt: '2024-02-15T00:00:00Z',
        },
      ]
    };
  },

  createOrganization: async (data: CreateOrganizationData): Promise<{ data: Organization }> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      data: {
        id: Math.random().toString(36).substr(2, 9),
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
        status: 'trial' as const,
        description: data.description,
        industry: data.industry,
        size: data.size,
        settings: data.settings || { timezone: 'UTC', currency: 'USD' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    };
  },

  switchOrganization: async (organizationId: string): Promise<{ data: Organization }> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mock organization data - in real app this would come from API
    const mockOrg: Organization = {
      id: organizationId,
      name: organizationId === '1' ? 'Acme Corporation' : 'StartupXYZ',
      slug: organizationId === '1' ? 'acme-corp' : 'startupxyz',
      status: organizationId === '1' ? 'active' : 'trial',
      settings: { timezone: 'UTC', currency: 'USD' },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
    };
    
    return { data: mockOrg };
  },

  inviteUser: async (organizationId: string, data: InviteUserData) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      data: {
        success: true,
        message: `User ${data.email} invited successfully with role ${data.role}`
      }
    };
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
          // Mock implementation
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const organizations = get().organizations;
          const updatedOrgs = organizations.map(org => 
            org.id === id ? { ...org, ...data, updatedAt: new Date().toISOString() } : org
          );
          
          const updatedOrg = updatedOrgs.find(org => org.id === id)!;
          
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
            success: true,
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
          // Mock implementation
          await new Promise(resolve => setTimeout(resolve, 500));
          
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
          // Mock implementation
          await new Promise(resolve => setTimeout(resolve, 500));
          
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
            endpoint: `/organizations/${organizationId}/users/${userId}/role`,
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
