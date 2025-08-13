import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '../services/api';
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
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      sessionExpiry: null,

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
          const response = await api.post('/auth/login', { email, password });
          const { user, token, refreshToken, expiresIn } = response.data;

          const sessionExpiry = Date.now() + (expiresIn * 1000);

          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            sessionExpiry,
            isLoading: false,
          });

          toast.success(`Welcome back, ${user.firstName}!`);
          return true;
        } catch (error: any) {
          const message = error.response?.data?.message || 'Login failed';
          toast.error(message);
          set({ isLoading: false });
          return false;
        }
      },

      // Signup
      signup: async (data: SignupData) => {
        set({ isLoading: true });

        try {
          const response = await api.post('/auth/signup', data);
          const { user, token, refreshToken, expiresIn } = response.data;

          const sessionExpiry = Date.now() + (expiresIn * 1000);

          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            sessionExpiry,
            isLoading: false,
          });

          toast.success('Account created successfully!');
          return true;
        } catch (error: any) {
          const message = error.response?.data?.message || 'Signup failed';
          toast.error(message);
          set({ isLoading: false });
          return false;
        }
      },

      // Logout
      logout: async () => {
        set({ isLoading: true });

        try {
          await api.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          get().clearAuth();
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
          const response = await api.post('/auth/refresh', { refreshToken });
          const { token, refreshToken: newRefreshToken, expiresIn } = response.data;

          const sessionExpiry = Date.now() + (expiresIn * 1000);

          set({
            token,
            refreshToken: newRefreshToken,
            sessionExpiry,
          });

          return true;
        } catch (error) {
          console.error('Session refresh error:', error);
          return false;
        }
      },

      // Validate session
      validateSession: async () => {
        const { token } = get();
        
        if (!token) {
          return false;
        }

        try {
          const response = await api.get('/auth/me');
          const { user } = response.data;

          set({ user, isAuthenticated: true });
          return true;
        } catch (error) {
          console.error('Session validation error:', error);
          return false;
        }
      },

      // Check auth (compatibility method)
      checkAuth: async () => {
        return get().validateSession();
      },

      // Clear auth
      clearAuth: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          sessionExpiry: null,
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
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        sessionExpiry: state.sessionExpiry,
      }),
    }
  )
); 