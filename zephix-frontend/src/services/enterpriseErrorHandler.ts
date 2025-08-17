/**
 * Enterprise Error Handler
 * Implements OWASP ASVS Level 1 compliant error handling
 * NEVER exposes internal errors to users
 */

export interface EnterpriseError {
  code: string;
  userMessage: string;
  internalMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  sessionId?: string;
}

export class EnterpriseErrorHandler {
  private static instance: EnterpriseErrorHandler;
  private errorLog: EnterpriseError[] = [];

  private constructor() {}

  public static getInstance(): EnterpriseErrorHandler {
    if (!EnterpriseErrorHandler.instance) {
      EnterpriseErrorHandler.instance = new EnterpriseErrorHandler();
    }
    return EnterpriseErrorHandler.instance;
  }

  /**
   * Handle authentication errors securely
   */
  public handleAuthError(error: any, context: string): EnterpriseError {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    
    // NEVER expose internal error details to users
    let userMessage: string;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    // Map internal errors to user-friendly messages
    if (error?.response?.status === 401) {
      userMessage = 'Invalid credentials. Please check your email and password.';
      severity = 'low';
    } else if (error?.response?.status === 403) {
      userMessage = 'Access denied. Please contact your administrator.';
      severity = 'high';
    } else if (error?.response?.status === 429) {
      userMessage = 'Too many login attempts. Please try again later.';
      severity = 'medium';
    } else if (error?.response?.status >= 500) {
      userMessage = 'Service temporarily unavailable. Please try again later.';
      severity = 'medium';
    } else {
      userMessage = 'Authentication failed. Please try again.';
      severity = 'medium';
    }

    // Create secure error object
    const enterpriseError: EnterpriseError = {
      code: errorId,
      userMessage,
      internalMessage: this.sanitizeInternalError(error),
      severity,
      timestamp,
    };

    // Log error securely (NEVER to console in production)
    this.logErrorSecurely(enterpriseError, context);
    
    return enterpriseError;
  }

  /**
   * Handle API errors securely
   */
  public handleApiError(error: any, endpoint: string): EnterpriseError {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    
    // Generic user message for API errors
    const userMessage = 'Service temporarily unavailable. Please try again.';
    
    const enterpriseError: EnterpriseError = {
      code: errorId,
      userMessage,
      internalMessage: this.sanitizeInternalError(error),
      severity: 'medium',
      timestamp,
    };

    this.logErrorSecurely(enterpriseError, `API:${endpoint}`);
    return enterpriseError;
  }

  /**
   * Handle validation errors securely
   */
  public handleValidationError(field: string, rule: string): EnterpriseError {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    
    // User-friendly validation messages
    const userMessage = `Please check your ${field} and try again.`;
    
    const enterpriseError: EnterpriseError = {
      code: errorId,
      userMessage,
      internalMessage: `Validation failed: ${field} - ${rule}`,
      severity: 'low',
      timestamp,
    };

    this.logErrorSecurely(enterpriseError, 'Validation');
    return enterpriseError;
  }

  /**
   * Sanitize internal error for logging
   */
  private sanitizeInternalError(error: any): string {
    try {
      // Remove sensitive information
      const sanitized = {
        type: error?.constructor?.name || 'Unknown',
        message: error?.message || 'No message',
        status: error?.response?.status,
        endpoint: error?.config?.url,
        timestamp: new Date().toISOString(),
      };

      // NEVER include stack traces, tokens, or sensitive data
      return JSON.stringify(sanitized);
    } catch {
      return 'Error sanitization failed';
    }
  }

  /**
   * Log error securely
   */
  private logErrorSecurely(error: EnterpriseError, context: string): void {
    // Add to internal log
    this.errorLog.push({
      ...error,
      internalMessage: `${context}: ${error.internalMessage}`,
    });

    // In production, send to secure logging service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to enterprise logging service
      // this.sendToLoggingService(error);
    } else {
      // Development only - NEVER in production
      console.error(`🔒 [${error.severity.toUpperCase()}] ${error.code}:`, {
        context,
        userMessage: error.userMessage,
        timestamp: error.timestamp,
      });
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get error log (admin only)
   */
  public getErrorLog(): EnterpriseError[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  public clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(): {
    total: number;
    bySeverity: Record<string, number>;
    recentErrors: EnterpriseError[];
  } {
    const total = this.errorLog.length;
    const bySeverity = this.errorLog.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentErrors = this.errorLog.slice(-10); // Last 10 errors

    return { total, bySeverity, recentErrors };
  }
}

// Export singleton instance
export const enterpriseErrorHandler = EnterpriseErrorHandler.getInstance();
export default enterpriseErrorHandler;