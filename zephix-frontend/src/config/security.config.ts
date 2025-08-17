/**
 * Enterprise Security Configuration
 * Centralized security settings for Zephix Frontend
 */

export interface SecurityConfig {
  // API Security
  API_TIMEOUT: number;
  MAX_RETRIES: number;
  HTTPS_REQUIRED: boolean;
  
  // Authentication Security
  TOKEN_REFRESH_THRESHOLD: number; // seconds before expiry
  MAX_LOGIN_ATTEMPTS: number;
  LOCKOUT_DURATION: number; // minutes
  
  // Content Security
  CSP_NONCE_LENGTH: number;
  ALLOWED_ORIGINS: string[];
  
  // Logging & Monitoring
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  SECURITY_AUDIT_ENABLED: boolean;
  
  // Development Overrides
  DEV_MODE_OVERRIDES: {
    allowHttp: boolean;
    allowLocalhost: boolean;
    verboseLogging: boolean;
  };
}

// Environment-based security configuration
export const securityConfig: SecurityConfig = {
  // API Security
  API_TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 2,
  HTTPS_REQUIRED: import.meta.env.PROD,
  
  // Authentication Security
  TOKEN_REFRESH_THRESHOLD: 300, // 5 minutes before expiry
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15, // 15 minutes
  
  // Content Security
  CSP_NONCE_LENGTH: 32,
  ALLOWED_ORIGINS: [
    'https://getzephix.com',
    'https://www.getzephix.com',
    'https://app.getzephix.com',
    'https://zephix-frontend-production.up.railway.app',
    'https://zephix-backend-production.up.railway.app',
  ],
  
  // Logging & Monitoring
  LOG_LEVEL: import.meta.env.DEV ? 'debug' : 'error',
  SECURITY_AUDIT_ENABLED: true,
  
  // Development Overrides
  DEV_MODE_OVERRIDES: {
    allowHttp: import.meta.env.DEV,
    allowLocalhost: import.meta.env.DEV,
    verboseLogging: import.meta.env.DEV,
  },
};

// Security validation functions
export const securityValidators = {
  /**
   * Validate URL security requirements
   */
  validateUrl: (url: string): { isValid: boolean; reason?: string } => {
    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (securityConfig.HTTPS_REQUIRED && urlObj.protocol !== 'https:') {
        return { isValid: false, reason: 'HTTPS required in production' };
      }
      
      // Check hostname
      if (securityConfig.HTTPS_REQUIRED) {
        const hostname = urlObj.hostname.toLowerCase();
        
        // Block private/local networks
        if (hostname === 'localhost' || 
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.')) {
          return { isValid: false, reason: 'Private/local network not allowed in production' };
        }
      }
      
      return { isValid: true };
    } catch {
      return { isValid: false, reason: 'Invalid URL format' };
    }
  },

  /**
   * Validate environment variables
   */
  validateEnvironment: (): { isValid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    // Check required environment variables
    if (!import.meta.env.VITE_API_URL) {
      issues.push('VITE_API_URL is required');
    }
    
    // Validate API URL if present
    if (import.meta.env.VITE_API_URL) {
      const urlValidation = securityValidators.validateUrl(import.meta.env.VITE_API_URL);
      if (!urlValidation.isValid) {
        issues.push(`VITE_API_URL validation failed: ${urlValidation.reason}`);
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
    };
  },

  /**
   * Generate security audit report
   */
  generateSecurityReport: () => {
    const envValidation = securityValidators.validateEnvironment();
    
    return {
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE,
      production: import.meta.env.PROD,
      development: import.meta.env.DEV,
      securityConfig,
      environmentValidation: envValidation,
      userAgent: navigator.userAgent,
      currentUrl: window.location.href,
      securityFeatures: {
        httpsEnforced: securityConfig.HTTPS_REQUIRED,
        auditEnabled: securityConfig.SECURITY_AUDIT_ENABLED,
        timeoutConfigured: securityConfig.API_TIMEOUT > 0,
        retryLimitSet: securityConfig.MAX_RETRIES > 0,
      },
    };
  },
};

// Export default configuration
export default securityConfig;