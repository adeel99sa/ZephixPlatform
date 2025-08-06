import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../services/api';
import type { User, LoginCredentials } from '../types';
import { toast } from 'sonner';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  
  // API Actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<boolean>;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      
      // Basic state setters
      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        }),
      clearAuth: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        }),
      setLoading: (loading) => set({ isLoading: loading }),
      
      // API Actions
      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true });
          const response = await authApi.login(credentials);
          set({
            user: response.user,
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
          toast.success(`Welcome back, ${response.user.firstName}!`);
          return true;
        } catch (error) {
          set({ isLoading: false });
          console.error('Login failed:', error);
          return false;
        }
      },
      
      register: async (userData) => {
        try {
          set({ isLoading: true });
          const response = await authApi.register(userData);
          set({
            user: response.user,
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
          toast.success(`Welcome to Zephix AI, ${response.user.firstName}!`);
          return true;
        } catch (error) {
          set({ isLoading: false });
          console.error('Registration failed:', error);
          return false;
        }
      },
      
      logout: async () => {
        try {
          await authApi.logout();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          console.error('Logout failed:', error);
          // Clear auth state even if API call fails
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
      
      getCurrentUser: async () => {
        try {
          set({ isLoading: true });
          const response = await authApi.getCurrentUser();
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error) {
          set({ 
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false 
          });
          console.error('Failed to get current user:', error);
          return false;
        }
      },
      
      checkAuth: async () => {
        const { token, isAuthenticated } = get();
        
        if (!token || !isAuthenticated) {
          return false;
        }
        
        try {
          const success = await get().getCurrentUser();
          return success;
        } catch (error) {
          console.error('Auth check failed:', error);
          return false;
        }
      },
    }),
    {
      name: 'zephix-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
); 