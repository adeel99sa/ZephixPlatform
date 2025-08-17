/**
 * Enterprise Security Authentication Store
 * Zustand store for enterprise authentication state management
 */

import { create } from 'zustand';
import { enterpriseAuthService } from '../services/enterpriseAuth.service';
import { securityMiddleware } from '../middleware/security.middleware';

interface EnterpriseAuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  
  // Actions
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: any) => Promise<boolean>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  clearAuth: () => void;
}

export const useEnterpriseAuthStore = create<EnterpriseAuthState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  isLoading: false,
  user: null,

  // Initialize authentication
  initializeAuth: async () => {
    set({ isLoading: true });
    
    try {
      // Log security event
      securityMiddleware.logSecurityEvent('enterprise_auth_initialization_started', {
        timestamp: new Date().toISOString(),
      }, 'low');

      // Check if user is already authenticated
      const isAuth = enterpriseAuthService.isAuthenticated();
      const user = enterpriseAuthService.getCurrentUser();
      
      set({
        isAuthenticated: isAuth,
        user,
        isLoading: false,
      });

      securityMiddleware.logSecurityEvent('enterprise_auth_initialization_completed', {
        isAuthenticated: isAuth,
        hasUser: !!user,
        timestamp: new Date().toISOString(),
      }, 'low');

    } catch (error) {
      securityMiddleware.logSecurityEvent('enterprise_auth_initialization_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }, 'high');
      
      set({ isLoading: false, isAuthenticated: false, user: null });
    }
  },

  // Login
  login: async (email: string, password: string) => {
    set({ isLoading: true });
    
    try {
      const success = await enterpriseAuthService.loginSecurely({ email, password });
      
      if (success) {
        const isAuth = enterpriseAuthService.isAuthenticated();
        const user = enterpriseAuthService.getCurrentUser();
        
        set({
          isAuthenticated: isAuth,
          user,
          isLoading: false,
        });

        return true;
      } else {
        set({ isLoading: false });
        return false;
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Signup
  signup: async (data: any) => {
    set({ isLoading: true });
    
    try {
      const success = await enterpriseAuthService.signupSecurely(data);
      
      if (success) {
        const isAuth = enterpriseAuthService.isAuthenticated();
        const user = enterpriseAuthService.getCurrentUser();
        
        set({
          isAuthenticated: isAuth,
          user,
          isLoading: false,
        });

        return true;
      } else {
        set({ isLoading: false });
        return false;
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Logout
  logout: async () => {
    set({ isLoading: true });
    
    try {
      await enterpriseAuthService.logoutSecurely();
      
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    } catch (error) {
      // Even if logout fails, clear local state
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
      throw error;
    }
  },

  // Validate session
  validateSession: async () => {
    try {
      const isValid = enterpriseAuthService.isAuthenticated();
      
      if (isValid !== get().isAuthenticated) {
        set({ isAuthenticated: isValid });
      }
      
      return isValid;
    } catch (error) {
      set({ isAuthenticated: false, user: null });
      return false;
    }
  },

  // Clear auth
  clearAuth: () => {
    enterpriseAuthService.clearAuthState();
    set({
      isAuthenticated: false,
      user: null,
      isLoading: false,
    });
  },
}));