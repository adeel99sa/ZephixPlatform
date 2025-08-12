import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../services/api';
import type { User, LoginCredentials } from '../types';
import type { BaseStoreState, AsyncResult } from '../types/store';
import { createError } from '../types/store';
import { toast } from 'sonner';
import { setSentryUser, clearSentryUser, addSentryBreadcrumb, captureSentryError } from '../config/sentry';

interface AuthState extends BaseStoreState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // Actions
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean, action?: string) => void;
  
  // API Actions
  login: (credentials: LoginCredentials) => Promise<AsyncResult<{ user: User; token: string }>>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<AsyncResult<{ user: User; token: string }>>;
  logout: () => Promise<AsyncResult<void>>;
  getCurrentUser: () => Promise<AsyncResult<User>>;
  checkAuth: () => Promise<AsyncResult<boolean>>;
  clearError: () => void;
  clearSuccess: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      loadingAction: undefined,
      loadingStartTime: undefined,
      error: null,
      errorTimestamp: undefined,
      lastSuccess: undefined,
      successTimestamp: undefined,
      
      // Basic state setters
      setAuth: (user, token) => {
        // Set Sentry user context
        setSentryUser({
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        });
        
        addSentryBreadcrumb('User authenticated', 'auth', {
          userId: user.id,
          userEmail: user.email,
        });
        
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          loadingAction: undefined,
          loadingStartTime: undefined,
          error: null,
          errorTimestamp: undefined,
        });
      },
      clearAuth: () => {
        // Clear Sentry user context
        clearSentryUser();
        
        addSentryBreadcrumb('User logged out', 'auth');
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          loadingAction: undefined,
          loadingStartTime: undefined,
          error: null,
          errorTimestamp: undefined,
        });
      },
      setLoading: (loading, action) => {
        console.log(`⏳ AuthStore: Setting loading state to ${loading}${action ? ` for ${action}` : ''}`);
        set({ 
          isLoading: loading,
          loadingAction: action,
          loadingStartTime: loading ? performance.now() : undefined
        });
      },
      
      // API Actions
      login: async (credentials: LoginCredentials) => {
        const startTime = performance.now();
        const action = 'login';
        
        console.log(`🔐 AuthStore: Starting ${action} for user: ${credentials.email}`);
        
        set({ 
          isLoading: true, 
          loadingAction: action,
          loadingStartTime: startTime,
          error: null 
        });
        
        try {
          const response = await authApi.login(credentials);
          const endTime = performance.now();
          
          console.log(`✅ AuthStore: ${action} completed in ${(endTime - startTime).toFixed(2)}ms`);
          
          set({
            user: response.user,
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            loadingAction: undefined,
            loadingStartTime: undefined,
            lastSuccess: `Welcome back, ${response.user.firstName}!`,
            successTimestamp: new Date().toISOString()
          });
          
          toast.success(`Welcome back, ${response.user.firstName}!`);
          
          return {
            success: true,
            data: { user: response.user, token: response.accessToken }
          };
        } catch (error) {
          const endTime = performance.now();
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          const storeError = createError('auth', errorMessage, {
            reason: 'invalid_credentials',
            endpoint: '/auth/login',
            method: 'POST'
          });
          
          console.error(`❌ AuthStore: ${action} failed after ${(endTime - startTime).toFixed(2)}ms`);
          console.error('AuthStore Error:', error);
          
          // Capture error in Sentry
          captureSentryError(error as Error, {
            action: 'login',
            email: credentials.email,
            duration: endTime - startTime,
          }, {
            auth_action: 'login',
            auth_reason: 'invalid_credentials',
          });
          
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
      
      register: async (userData) => {
        const startTime = performance.now();
        const action = 'register';
        
        console.log(`📝 AuthStore: Starting ${action} for user: ${userData.email}`);
        
        set({ 
          isLoading: true, 
          loadingAction: action,
          loadingStartTime: startTime,
          error: null 
        });
        
        try {
          const response = await authApi.register(userData);
          const endTime = performance.now();
          
          console.log(`✅ AuthStore: ${action} completed in ${(endTime - startTime).toFixed(2)}ms`);
          
          set({
            user: response.user,
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            loadingAction: undefined,
            loadingStartTime: undefined,
            lastSuccess: `Welcome to Zephix AI, ${response.user.firstName}!`,
            successTimestamp: new Date().toISOString()
          });
          
          toast.success(`Welcome to Zephix AI, ${response.user.firstName}!`);
          
          return {
            success: true,
            data: { user: response.user, token: response.accessToken }
          };
        } catch (error) {
          const endTime = performance.now();
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          const storeError = createError('auth', errorMessage, {
            reason: 'unauthorized',
            endpoint: '/auth/register',
            method: 'POST'
          });
          
          console.error(`❌ AuthStore: ${action} failed after ${(endTime - startTime).toFixed(2)}ms`);
          console.error('AuthStore Error:', error);
          
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
      
      logout: async () => {
        const startTime = performance.now();
        const action = 'logout';
        
        console.log(`🚪 AuthStore: Starting ${action}`);
        
        set({ 
          isLoading: true, 
          loadingAction: action,
          loadingStartTime: startTime,
          error: null 
        });
        
        try {
          await authApi.logout();
          const endTime = performance.now();
          
          console.log(`✅ AuthStore: ${action} completed in ${(endTime - startTime).toFixed(2)}ms`);
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            loadingAction: undefined,
            loadingStartTime: undefined,
            lastSuccess: 'Successfully logged out',
            successTimestamp: new Date().toISOString()
          });
          
          return {
            success: true
          };
        } catch (error) {
          const endTime = performance.now();
          const errorMessage = error instanceof Error ? error.message : 'Logout failed';
          const storeError = createError('auth', errorMessage, {
            reason: 'unauthorized',
            endpoint: '/auth/logout',
            method: 'POST'
          });
          
          console.error(`❌ AuthStore: ${action} failed after ${(endTime - startTime).toFixed(2)}ms`);
          console.error('AuthStore Error:', error);
          
          // Clear auth state even if API call fails
          set({
            user: null,
            token: null,
            isAuthenticated: false,
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
      
      getCurrentUser: async () => {
        const startTime = performance.now();
        const action = 'getCurrentUser';
        
        console.log(`👤 AuthStore: Starting ${action}`);
        
        set({ 
          isLoading: true, 
          loadingAction: action,
          loadingStartTime: startTime,
          error: null 
        });
        
        try {
          const response = await authApi.getCurrentUser();
          const endTime = performance.now();
          
          console.log(`✅ AuthStore: ${action} completed in ${(endTime - startTime).toFixed(2)}ms`);
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            loadingAction: undefined,
            loadingStartTime: undefined,
            lastSuccess: 'User session validated',
            successTimestamp: new Date().toISOString()
          });
          
          return {
            success: true,
            data: response.user
          };
        } catch (error) {
          const endTime = performance.now();
          const errorMessage = error instanceof Error ? error.message : 'Failed to get current user';
          const storeError = createError('auth', errorMessage, {
            reason: 'token_expired',
            endpoint: '/auth/me',
            method: 'GET'
          });
          
          console.error(`❌ AuthStore: ${action} failed after ${(endTime - startTime).toFixed(2)}ms`);
          console.error('AuthStore Error:', error);
          
          set({ 
            user: null,
            token: null,
            isAuthenticated: false,
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
      
      checkAuth: async () => {
        const { token, isAuthenticated } = get();
        
        if (!token || !isAuthenticated) {
          return {
            success: false,
            data: false
          };
        }
        
        try {
          const result = await get().getCurrentUser();
          return {
            success: result.success,
            data: result.success
          };
        } catch (error: any) {
          // If token is expired (401), try to refresh it
          if (error?.status === 401) {
            console.log('🔄 Token expired, attempting refresh...');
            try {
              const refreshResult = await authApi.refreshToken();
              if (refreshResult.accessToken) {
                // Update the token in store
                const currentState = get();
                set({
                  ...currentState,
                  token: refreshResult.accessToken,
                  isAuthenticated: true,
                });
                
                // Try to get current user again
                const userResult = await get().getCurrentUser();
                return {
                  success: userResult.success,
                  data: userResult.success
                };
              }
            } catch (refreshError) {
              console.log('❌ Token refresh failed, clearing auth state');
              // If refresh fails, clear auth state
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                loadingAction: undefined,
                loadingStartTime: undefined,
                error: null,
                errorTimestamp: undefined,
              });
              return {
                success: false,
                data: false
              };
            }
          }
          
          const errorMessage = error instanceof Error ? error.message : 'Auth check failed';
          const storeError = createError('auth', errorMessage, {
            reason: 'unauthorized',
            endpoint: '/auth/check',
            method: 'GET'
          });
          
          console.error('AuthStore Error:', error);
          
          return {
            success: false,
            error: storeError,
            data: false
          };
        }
      },
      
      clearError: () => {
        console.log('🧹 AuthStore: Clearing error state');
        set({ 
          error: null,
          errorTimestamp: undefined
        });
      },
      
      clearSuccess: () => {
        console.log('🧹 AuthStore: Clearing success state');
        set({ 
          lastSuccess: undefined,
          successTimestamp: undefined
        });
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