/**
 * Enterprise Security Hook
 * Provides security utilities and monitoring for React components
 */

import { useEffect, useCallback, useState } from 'react';
import { securityMiddleware, type SecurityEvent } from '../middleware/security.middleware';
import { securityConfig, securityValidators } from '../config/security.config';

export interface SecurityState {
  isInitialized: boolean;
  environmentValid: boolean;
  securityIssues: string[];
  lastAudit: string | null;
  eventCount: number;
}

export interface SecurityActions {
  logEvent: (type: string, details: any, severity?: SecurityEvent['severity']) => void;
  getAuditReport: () => any;
  clearEvents: () => void;
  validateEnvironment: () => { isValid: boolean; issues: string[] };
}

export const useSecurity = (): [SecurityState, SecurityActions] => {
  const [securityState, setSecurityState] = useState<SecurityState>({
    isInitialized: false,
    environmentValid: false,
    securityIssues: [],
    lastAudit: null,
    eventCount: 0,
  });

  // Initialize security monitoring
  useEffect(() => {
    const initializeSecurity = () => {
      try {
        // Validate environment
        const envValidation = securityValidators.validateEnvironment();
        
        // Generate initial security report
        const auditReport = securityMiddleware.getSecurityAuditReport();
        
        setSecurityState({
          isInitialized: true,
          environmentValid: envValidation.isValid,
          securityIssues: envValidation.issues,
          lastAudit: auditReport.timestamp,
          eventCount: auditReport.totalEvents,
        });

        // Log initialization
        securityMiddleware.logSecurityEvent('security_hook_initialized', {
          environment: import.meta.env.MODE,
          production: import.meta.env.PROD,
          validation: envValidation,
        }, 'low');

      } catch (error) {
        console.error('Security initialization failed:', error);
        setSecurityState(prev => ({
          ...prev,
          isInitialized: true,
          environmentValid: false,
          securityIssues: ['Security initialization failed'],
        }));
      }
    };

    initializeSecurity();
  }, []);

  // Log security event
  const logEvent = useCallback((
    type: string, 
    details: any, 
    severity: SecurityEvent['severity'] = 'low'
  ) => {
    securityMiddleware.logSecurityEvent(type, details, severity);
    
    // Update state
    setSecurityState(prev => ({
      ...prev,
      eventCount: prev.eventCount + 1,
    }));
  }, []);

  // Get security audit report
  const getAuditReport = useCallback(() => {
    const report = securityMiddleware.getSecurityAuditReport();
    setSecurityState(prev => ({
      ...prev,
      lastAudit: report.timestamp,
      eventCount: report.totalEvents,
    }));
    return report;
  }, []);

  // Clear security events
  const clearEvents = useCallback(() => {
    securityMiddleware.clearSecurityEvents();
    setSecurityState(prev => ({
      ...prev,
      eventCount: 0,
      lastAudit: null,
    }));
  }, []);

  // Validate environment
  const validateEnvironment = useCallback(() => {
    const validation = securityValidators.validateEnvironment();
    setSecurityState(prev => ({
      ...prev,
      environmentValid: validation.isValid,
      securityIssues: validation.issues,
    }));
    return validation;
  }, []);

  // Monitor for security events
  useEffect(() => {
    const handleStorageChange = () => {
      // Update event count when storage changes
      const report = securityMiddleware.getSecurityAuditReport();
      setSecurityState(prev => ({
        ...prev,
        eventCount: report.totalEvents,
      }));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Security actions
  const securityActions: SecurityActions = {
    logEvent,
    getAuditReport,
    clearEvents,
    validateEnvironment,
  };

  return [securityState, securityActions];
};

// Export security utilities
export const securityUtils = {
  config: securityConfig,
  validators: securityValidators,
  middleware: securityMiddleware,
};

export default useSecurity;