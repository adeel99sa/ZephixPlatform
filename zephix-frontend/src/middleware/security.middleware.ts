/**
 * Enterprise Security Middleware
 * Provides security utilities and interceptors for the application
 */

import { securityConfig, securityValidators } from '../config/security.config';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  userAgent?: string;
  url?: string;
  userId?: string;
}

export class SecurityMiddleware {
  private static instance: SecurityMiddleware;
  private eventQueue: SecurityEvent[] = [];
  private isProcessing = false;

  private constructor() {
    this.initializeSecurityMonitoring();
  }

  public static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware();
    }
    return SecurityMiddleware.instance;
  }

  /**
   * Initialize security monitoring
   */
  private initializeSecurityMonitoring(): void {
    // Monitor for security-related events
    this.setupEventListeners();
    
    // Generate initial security report
    this.logSecurityEvent('security_middleware_initialized', {
      config: securityConfig,
      environment: import.meta.env.MODE,
      timestamp: new Date().toISOString(),
    }, 'low');

    // Validate environment on startup
    const envValidation = securityValidators.validateEnvironment();
    if (!envValidation.isValid) {
      this.logSecurityEvent('environment_validation_failed', {
        issues: envValidation.issues,
        severity: 'high',
      }, 'high');
    }
  }

  /**
   * Setup security event listeners
   */
  private setupEventListeners(): void {
    // Monitor for suspicious activities
    window.addEventListener('beforeunload', (event) => {
      this.logSecurityEvent('page_unload', {
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }, 'low');
    });

    // Monitor for navigation changes
    window.addEventListener('popstate', () => {
      this.logSecurityEvent('navigation_change', {
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }, 'low');
    });

    // Monitor for storage access
    this.monitorStorageAccess();
  }

  /**
   * Monitor storage access for security
   */
  private monitorStorageAccess(): void {
    const originalSetItem = localStorage.setItem;
    const originalGetItem = localStorage.getItem;
    const originalRemoveItem = localStorage.removeItem;

    // Intercept localStorage.setItem
    localStorage.setItem = (key: string, value: string) => {
      this.logSecurityEvent('local_storage_write', {
        key,
        valueLength: value.length,
        timestamp: new Date().toISOString(),
      }, 'low');
      
      return originalSetItem.call(localStorage, key, value);
    };

    // Intercept localStorage.getItem
    localStorage.getItem = (key: string) => {
      this.logSecurityEvent('local_storage_read', {
        key,
        timestamp: new Date().toISOString(),
      }, 'low');
      
      return originalGetItem.call(localStorage, key);
    };

    // Intercept localStorage.removeItem
    localStorage.removeItem = (key: string) => {
      this.logSecurityEvent('local_storage_delete', {
        key,
        timestamp: new Date().toISOString(),
      }, 'low');
      
      return originalRemoveItem.call(localStorage, key);
    };
  }

  /**
   * Log security event
   */
  public logSecurityEvent(
    type: string, 
    details: any, 
    severity: SecurityEvent['severity'] = 'low'
  ): void {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      severity,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Add to queue
    this.eventQueue.push(event);

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processEventQueue();
    }

    // Console logging based on severity and config
    if (securityConfig.LOG_LEVEL === 'debug' || severity === 'high' || severity === 'critical') {
      const emoji = this.getSeverityEmoji(severity);
      console.log(`${emoji} [${severity.toUpperCase()}] ${type}:`, event);
    }
  }

  /**
   * Process security event queue
   */
  private async processEventQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        if (event) {
          await this.processSecurityEvent(event);
        }
      }
    } catch (error) {
      console.error('Error processing security events:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual security event
   */
  private async processSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Critical events require immediate attention
      if (event.severity === 'critical') {
        await this.handleCriticalEvent(event);
      }

      // High severity events should be logged to monitoring service
      if (event.severity === 'high' || event.severity === 'critical') {
        await this.sendToMonitoringService(event);
      }

      // Store event for audit trail
      this.storeSecurityEvent(event);

    } catch (error) {
      console.error('Error processing security event:', error);
    }
  }

  /**
   * Handle critical security events
   */
  private async handleCriticalEvent(event: SecurityEvent): Promise<void> {
    // Log to console immediately
    console.error('🚨 CRITICAL SECURITY EVENT:', event);

    // In production, this could trigger alerts, notifications, etc.
    if (import.meta.env.PROD) {
      // TODO: Implement critical event handling
      // - Send to security monitoring service
      // - Trigger admin notifications
      // - Log to external security log
    }
  }

  /**
   * Send event to monitoring service
   */
  private async sendToMonitoringService(event: SecurityEvent): Promise<void> {
    // In production, send to security monitoring service
    if (import.meta.env.PROD) {
      try {
        // TODO: Implement monitoring service integration
        // await apiClient.post('/security/events', event);
      } catch (error) {
        console.error('Failed to send security event to monitoring service:', error);
      }
    }
  }

  /**
   * Store security event for audit trail
   */
  private storeSecurityEvent(event: SecurityEvent): void {
    try {
      // Store in memory for session
      const events = JSON.parse(sessionStorage.getItem('security_events') || '[]');
      events.push(event);
      
      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      sessionStorage.setItem('security_events', JSON.stringify(events));
    } catch (error) {
      console.error('Failed to store security event:', error);
    }
  }

  /**
   * Get severity emoji for console logging
   */
  private getSeverityEmoji(severity: SecurityEvent['severity']): string {
    switch (severity) {
      case 'low': return '🔵';
      case 'medium': return '🟡';
      case 'high': return '🟠';
      case 'critical': return '🚨';
      default: return '🔵';
    }
  }

  /**
   * Get security audit report
   */
  public getSecurityAuditReport(): any {
    const events = JSON.parse(sessionStorage.getItem('security_events') || '[]');
    
    return {
      timestamp: new Date().toISOString(),
      totalEvents: events.length,
      eventsBySeverity: events.reduce((acc: any, event: SecurityEvent) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      }, {}),
      recentEvents: events.slice(-10),
      securityConfig,
      environmentValidation: securityValidators.validateEnvironment(),
    };
  }

  /**
   * Clear security events
   */
  public clearSecurityEvents(): void {
    sessionStorage.removeItem('security_events');
    this.eventQueue = [];
  }
}

// Export singleton instance
export const securityMiddleware = SecurityMiddleware.getInstance();
export default securityMiddleware;