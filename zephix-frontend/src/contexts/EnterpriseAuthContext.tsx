/**
 * Authentication Context
 * Provides authentication context with security monitoring
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { enterpriseAuthService } from '../services/enterpriseAuth.service';
import { securityMiddleware } from '../middleware/security.middleware';

interface EnterpriseAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  login: (credentials: { email: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  signup: (data: any) => Promise<boolean>;
  getSecurityEvents: () => any[];
}

const EnterpriseAuthContext = createContext<EnterpriseAuthContextType | undefined>(undefined);

/**
 * AuthProvider Component
 * Provides authentication context to entire application
 */
export const EnterpriseAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Initialize security monitoring
    securityMiddleware.logSecurityEvent('enterprise_auth_context_initialized', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    }, 'low');
  }, []);

  const value: EnterpriseAuthContextType = {
    isAuthenticated: enterpriseAuthService.isAuthenticated(),
    isLoading: false, // Managed by the service
    user: enterpriseAuthService.getCurrentUser(),
    login: enterpriseAuthService.loginSecurely,
    logout: enterpriseAuthService.logoutSecurely,
    signup: enterpriseAuthService.signupSecurely,
    getSecurityEvents: enterpriseAuthService.getSecurityEvents,
  };

  return <EnterpriseAuthContext.Provider value={value}>{children}</EnterpriseAuthContext.Provider>;
};

/**
 * useAuth Hook
 * Provides access to authentication context
 */
export const useEnterpriseAuth = () => {
  const context = useContext(EnterpriseAuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};