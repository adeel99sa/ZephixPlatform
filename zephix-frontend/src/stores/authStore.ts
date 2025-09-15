import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '../services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role: string;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  expiresAt: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string, twoFactorCode?: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

// Helper function to validate token
const isValidToken = (token: string | null): boolean => {
  return !!(token && token !== 'null' && token !== null && typeof token === 'string' && token.length > 0);
};

// Cleanup corrupted localStorage on app start
const cleanupCorruptedAuth = () => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      if (parsed.state?.accessToken === 'null') {
        console.warn('Cleaning up corrupted auth storage on app start');
        localStorage.removeItem('auth-storage');
      }
    }
  } catch (error) {
    console.error('Error during auth cleanup:', error);
    localStorage.removeItem('auth-storage');
  }
};

// Run cleanup immediately
cleanupCorruptedAuth();

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      expiresAt: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password, twoFactorCode) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', {
            email,
            password,
            twoFactorCode,
          });

          const { user, accessToken, expiresIn } = response.data;
          const expiresAt = Date.now() + (expiresIn * 1000);

          // Set auth header for future requests
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          set({
            user,
            accessToken,
            expiresAt,
            isAuthenticated: true,
            isLoading: false,
          });

          // Schedule token refresh
          get().scheduleTokenRefresh(expiresIn);
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/signup', data);
          
          const { user, accessToken, expiresIn, message } = response.data;
          const expiresAt = Date.now() + (expiresIn * 1000);

          // Set auth header
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          set({
            user,
            accessToken,
            expiresAt,
            isAuthenticated: true,
            isLoading: false,
          });

          // Schedule token refresh
          get().scheduleTokenRefresh(expiresIn);

          // Return message for UI to display
          return message;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Signup failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear auth state regardless
          delete api.defaults.headers.common['Authorization'];
          set({
            user: null,
            accessToken: null,
            expiresAt: null,
            isAuthenticated: false,
          });
        }
      },

      refreshToken: async () => {
        try {
          const response = await api.post('/auth/refresh');
          const { accessToken, expiresIn } = response.data;
          const expiresAt = Date.now() + (expiresIn * 1000);

          // Update auth header
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          set({
            accessToken,
            expiresAt,
          });

          // Schedule next refresh
          get().scheduleTokenRefresh(expiresIn);
        } catch (error) {
          // Refresh failed, logout user
          get().logout();
        }
      },

      checkAuth: async () => {
        const state = get();
        
        // Check if token expired
        if (state.expiresAt && Date.now() >= state.expiresAt) {
          await get().refreshToken();
          return;
        }

        // Verify token with backend
        if (state.accessToken) {
          try {
            api.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`;
            const response = await api.get('/auth/me');
            set({ user: response.data.user, isAuthenticated: true });
          } catch (error) {
            get().logout();
          }
        }
      },

      clearError: () => set({ error: null }),

      // Private helper method
      scheduleTokenRefresh: (expiresIn: number) => {
        // Refresh 1 minute before expiry
        const refreshTime = (expiresIn - 60) * 1000;
        
        setTimeout(() => {
          get().refreshToken();
        }, refreshTime);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage, {
        serialize: (state) => {
          // Custom serialization to handle null values properly
          const serialized = JSON.stringify(state, (key, value) => {
            // Convert null to null primitive, not "null" string
            if (value === null) return null;
            return value;
          });
          return serialized;
        },
        deserialize: (str) => {
          try {
            const parsed = JSON.parse(str);
            // Ensure accessToken is null primitive, not "null" string
            if (parsed.state?.accessToken === 'null') {
              console.warn('Detected corrupted token "null" string, clearing auth storage');
              localStorage.removeItem('auth-storage');
              return { state: { user: null, accessToken: null, expiresAt: null, isAuthenticated: false }, version: 0 };
            }
            return parsed;
          } catch (error) {
            console.error('Failed to deserialize auth storage:', error);
            localStorage.removeItem('auth-storage');
            return { state: { user: null, accessToken: null, expiresAt: null, isAuthenticated: false }, version: 0 };
          }
        },
      }),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        expiresAt: state.expiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Axios interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await useAuthStore.getState().refreshToken();
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);