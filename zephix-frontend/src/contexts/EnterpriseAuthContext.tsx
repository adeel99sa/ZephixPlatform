/**
 * Enterprise Security Authentication Context
 * Provides enterprise-grade authentication context with security monitoring
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { enterpriseAuthService } from '../services/enterpriseAuth.service';
import { securityMiddleware } from '../middleware/security.middleware';

interface EnterpriseAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  signup: (data: any) => Promise<boolean>;
  validateSession: () => Promise<boolean>;
  getSecurityEvents: () => any[];
}

const EnterpriseAuthContext = createContext<EnterpriseAuthContextType | undefined>(undefined);

/**
 * EnterpriseAuthProvider Component
 * Provides enterprise authentication context to entire application
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
    validateSession: enterpriseAuthService.validateTokenIntegrity.bind(enterpriseAuthService, enterpriseAuthService.getAuthState().accessToken || ''),
    getSecurityEvents: enterpriseAuthService.getSecurityEvents,
  };

  return <EnterpriseAuthContext.Provider value={value}>{children}</EnterpriseAuthContext.Provider>;
};

/**
 * useEnterpriseAuth Hook
 * Provides access to enterprise authentication context
 */
export const useEnterpriseAuth = () => {
  const context = useContext(EnterpriseAuthContext);
  if (context === undefined) {
    throw new Error('useEnterpriseAuth must be used within an EnterpriseAuthProvider');
  }
  return context;
};