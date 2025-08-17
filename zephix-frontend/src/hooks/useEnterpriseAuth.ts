/**
 * Enterprise Security Authentication Hook
 * Provides secure authentication methods with full security monitoring
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { enterpriseAuthService } from '../services/enterpriseAuth.service';
import type { SecureAuthState } from '../services/enterpriseAuth.service';
import { securityMiddleware } from '../middleware/security.middleware';

export interface UseEnterpriseAuthReturn {
  // State
  authState: SecureAuthState;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: { email: string; password: string }) => Promise<boolean>;
  signup: (userData: { firstName: string; lastName: string; email: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  
  // Security
  validateSession: () => Promise<boolean>;
  getSecurityEvents: () => any[];
  clearError: () => void;
}

export const useEnterpriseAuth = (): UseEnterpriseAuthReturn => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<SecureAuthState>(enterpriseAuthService.getAuthState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local state when auth service state changes
  useEffect(() => {
    const updateState = () => {
      setAuthState(enterpriseAuthService.getAuthState());
    };

    // Initial state
    updateState();

    // Set up polling for state updates
    const interval = setInterval(updateState, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Enterprise-secure login
   */
  const login = useCallback(async (credentials: { email: string; password: string }): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Log security event
      securityMiddleware.logSecurityEvent('enterprise_login_attempt', {
        email: credentials.email,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }, 'medium');

      const success = await enterpriseAuthService.loginSecurely(credentials);

      if (success) {
        // Update local state
        setAuthState(enterpriseAuthService.getAuthState());
        
        // Log success
        securityMiddleware.logSecurityEvent('enterprise_login_success', {
          email: credentials.email,
          userId: enterpriseAuthService.getCurrentUser()?.id,
          timestamp: new Date().toISOString(),
        }, 'low');

        return true;
      } else {
        throw new Error('Login failed');
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);

      // Log failure
      securityMiddleware.logSecurityEvent('enterprise_login_failure', {
        email: credentials.email,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }, 'high');

      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Enterprise-secure signup
   */
  const signup = useCallback(async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Log security event
      securityMiddleware.logSecurityEvent('enterprise_signup_attempt', {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }, 'medium');

      const success = await enterpriseAuthService.signupSecurely(userData);

      if (success) {
        // Update local state
        setAuthState(enterpriseAuthService.getAuthState());
        
        // Log success
        securityMiddleware.logSecurityEvent('enterprise_signup_success', {
          email: userData.email,
          userId: enterpriseAuthService.getCurrentUser()?.id,
          timestamp: new Date().toISOString(),
        }, 'low');

        return true;
      } else {
        throw new Error('Signup failed');
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Signup failed';
      setError(errorMessage);

      // Log failure
      securityMiddleware.logSecurityEvent('enterprise_signup_failure', {
        email: userData.email,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }, 'high');

      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Enterprise-secure logout
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Log security event
      securityMiddleware.logSecurityEvent('enterprise_logout_attempt', {
        userId: enterpriseAuthService.getCurrentUser()?.id,
        timestamp: new Date().toISOString(),
      }, 'medium');

      await enterpriseAuthService.logoutSecurely();

      // Update local state
      setAuthState(enterpriseAuthService.getAuthState());
      
      // Navigate to login
      navigate('/login');

      // Log success
      securityMiddleware.logSecurityEvent('enterprise_logout_success', {
        timestamp: new Date().toISOString(),
      }, 'low');

    } catch (err: any) {
      const errorMessage = err.message || 'Logout failed';
      setError(errorMessage);

      // Log failure
      securityMiddleware.logSecurityEvent('enterprise_logout_failure', {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }, 'high');

      // Force navigation even if logout fails
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  /**
   * Refresh session securely
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      // This would implement token refresh logic
      // For now, return false to indicate refresh needed
      return false;
    } catch (error) {
      securityMiddleware.logSecurityEvent('enterprise_session_refresh_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }, 'high');
      return false;
    }
  }, []);

  /**
   * Validate current session
   */
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const isValid = enterpriseAuthService.isAuthenticated();
      
      if (!isValid) {
        securityMiddleware.logSecurityEvent('enterprise_session_validation_failed', {
          timestamp: new Date().toISOString(),
        }, 'medium');
      }

      return isValid;
    } catch (error) {
      securityMiddleware.logSecurityEvent('enterprise_session_validation_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }, 'high');
      return false;
    }
  }, []);

  /**
   * Get security events
   */
  const getSecurityEvents = useCallback(() => {
    return enterpriseAuthService.getSecurityEvents();
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    authState,
    isLoading,
    error,
    login,
    signup,
    logout,
    refreshSession,
    validateSession,
    getSecurityEvents,
    clearError,
  };
};