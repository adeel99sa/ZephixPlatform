import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiJson } from '../services/api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId?: string;
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpiry: number | null;
  isLoggingOut: boolean;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: SignupData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  validateSession: () => Promise<boolean>;
  initializeAuth: () => Promise<void>;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state - FIXED: isLoading should be false
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,  // CHANGED FROM true TO false
      sessionExpiry: null,
      isLoggingOut: false,

      // Initialize authentication on app load
      initializeAuth: async () => {
        set({ isLoading: true });
        
        try {
          const { token, refreshToken } = get();
          
          if (!token) {
            set({ isLoading: false, isAuthenticated: false });
            return;
          }

          // Parse JWT to check expiry
          try {
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            const isExpired = tokenPayload.exp * 1000 < Date.now();

            if (isExpired && refreshToken) {
              const refreshed = await get().refreshSession();
              if (!refreshed) {
                get().clearAuth();
              }
            } else if (!isExpired) {
              const isValid = await get().validateSession();
              if (!isValid) {
                get().clearAuth();
              }
            } else {
              get().clearAuth();
            }
          } catch (error) {
            // Invalid token format
            get().clearAuth();
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          get().clearAuth();
        } finally {
          set({ isLoading: false });
        }
      },

      // Login
      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          const response = await apiJson('/auth/login', { method: 'POST', body: { email, password } });
          const { user, accessToken, refreshToken, expiresIn } = response;

          const sessionExpiry = Date.now() + (expiresIn * 1000);

          set({
            user,
            token: accessToken,
            refreshToken,
            isAuthenticated: true,
            sessionExpiry,
            isLoading: false,
          });

          toast.success(`Welcome back, ${user.firstName}!`);
          return true;
        } catch (error: any) {
          const message = error.message || 'Login failed';
          toast.error(message);
          set({ isLoading: false });
          return false;
        }
      },

      // Signup
      signup: async (data: SignupData) => {
        set({ isLoading: true });

        try {
          const response = await apiJson('/auth/register', { method: 'POST', body: data });
          const { user, accessToken, refreshToken, expiresIn } = response;

          const sessionExpiry = Date.now() + (expiresIn * 1000);

          set({
            user,
            token: accessToken,
            refreshToken,
            isAuthenticated: true,
            sessionExpiry,
            isLoading: false,
          });

          toast.success('Account created successfully!');
          return true;
        } catch (error: any) {
          const message = error.message || 'Signup failed';
          toast.error(message);
          set({ isLoading: false });
          return false;
        }
      },

      // Logout - Fixed to prevent infinite loop
      logout: async () => {
        const state = get();
        
        // Prevent multiple simultaneous logout attempts
        if (state.isLoggingOut || state.isLoading) {
          return;
        }
        
        set({ isLoggingOut: true, isLoading: true });

        try {
          // Only try to call logout API if we have a token
          if (state.token) {
            await apiJson('/auth/logout', { method: 'POST' });
          }
        } catch (error) {
          console.log('Logout API call failed (this is normal):', error);
        } finally {
          // Always clear the auth state regardless of API call success
          get().clearAuth();
          set({ isLoggingOut: false });
          toast.success('Logged out successfully');
        }
      },

      // Refresh session
      refreshSession: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          return false;
        }

        try {
          const response = await apiJson('/auth/refresh', { method: 'POST', body: { refreshToken } });
          const { token, refreshToken: newRefreshToken, expiresIn } = response;

          const sessionExpiry = Date.now() + (expiresIn * 1000);

          set({
            token,
            refreshToken: newRefreshToken,
            sessionExpiry,
          });

          return true;
        } catch (error) {
          console.error('Token refresh failed:', error);
          return false;
        }
      },

      // Validate session
      validateSession: async () => {
        try {
          const response = await apiJson('/auth/me');
          const { user } = response;

          set({ user });
          return true;
        } catch (error) {
          console.error('Session validation failed:', error);
          return false;
        }
      },

      // Check auth (compatibility method)
      checkAuth: async () => {
        return get().validateSession();
      },

      // Clear auth - This never calls API, just clears local state
      clearAuth: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          sessionExpiry: null,
          isLoggingOut: false,
        });

        localStorage.removeItem('auth-storage');
      },

      // Update user
      updateUser: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...userData } });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // FIXED: Never persist isLoading as true
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        sessionExpiry: state.sessionExpiry,
        isLoading: false,  // ADDED: Always save as false
        isAuthenticated: state.isAuthenticated,  // ADDED: Persist auth state
      }),
    }
  )
);