import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'member';
  organizationId: string;
  avatar?: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;

  // Actions
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshAuthToken: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  getCurrentUser: () => Promise<User | null>;
  checkAuth: () => Promise<boolean>;
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,
      error: null,

      // Actions
      setTokens: (accessToken: string, refreshToken: string) => {
        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
          error: null,
        });
      },

      setUser: (user: User) => {
        set({ user, error: null });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Use the API client for proper path normalization
          const { apiClient } = await import('@/lib/api/client');
          const response = await apiClient.post('/auth/login', { email, password });
          
          // Handle the API response structure
          const userData = response.data?.user || response.user;
          const accessToken = response.data?.accessToken || response.accessToken;
          const refreshToken = response.data?.refreshToken || response.refreshToken;
          
          set({
            user: userData,
            accessToken: accessToken,
            refreshToken: refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          return true; // Return success
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
            isAuthenticated: false,
          });
          
          return false; // Return failure
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      refreshAuthToken: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        try {
          // Use the API client for proper path normalization
          const { apiClient } = await import('@/lib/api/client');
          const response = await apiClient.post('/auth/refresh', { refreshToken });
          
          set({
            accessToken: response.data?.accessToken || response.accessToken,
            refreshToken: response.data?.refreshToken || response.refreshToken,
            isAuthenticated: true,
          });
        } catch (error) {
          // If refresh fails, logout user
          get().logout();
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setHydrated: (hydrated: boolean) => {
        set({ isHydrated: hydrated });
      },

      getCurrentUser: async () => {
        const { user } = get();
        return user;
      },

      checkAuth: async () => {
        const { accessToken, user } = get();
        return !!(accessToken && user);
      },

      signup: async (email: string, password: string, firstName: string, lastName: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Use the API client for proper path normalization
          const { apiClient } = await import('@/lib/api/client');
          const response = await apiClient.post('/auth/signup', { email, password, firstName, lastName });
          
          const userData = response.data?.user || response.user;
          const accessToken = response.data?.accessToken || response.accessToken;
          const refreshToken = response.data?.refreshToken || response.refreshToken;
          
          set({
            user: userData,
            accessToken: accessToken,
            refreshToken: refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          return true;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Signup failed',
            isAuthenticated: false,
          });
          
          return false;
        }
      },
    }),
    {
      name: 'zephix-auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);