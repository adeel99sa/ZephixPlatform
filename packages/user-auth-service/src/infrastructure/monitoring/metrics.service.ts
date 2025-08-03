import promBundle from 'express-prom-bundle';
import { register, Counter, Histogram, Gauge } from 'prom-client';
import { Logger } from '../logging/logger';

/**
 * Enterprise metrics service for monitoring and observability
 * Implements Prometheus metrics collection with custom business metrics
 */
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly metricsMiddleware: any;

  // HTTP Metrics
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestTotal: Counter<string>;
  private readonly httpRequestErrors: Counter<string>;

  // Business Metrics
  private readonly userRegistrations: Counter<string>;
  private readonly userLogins: Counter<string>;
  private readonly userLoginsFailed: Counter<string>;
  private readonly passwordResets: Counter<string>;
  private readonly mfaSetups: Counter<string>;
  private readonly mfaVerifications: Counter<string>;

  // System Metrics
  private readonly activeUsers: Gauge<string>;
  private readonly databaseConnections: Gauge<string>;
  private readonly redisConnections: Gauge<string>;
  private readonly memoryUsage: Gauge<string>;
  private readonly cpuUsage: Gauge<string>;

  constructor() {
    // Initialize Prometheus bundle middleware with valid label names
    this.metricsMiddleware = promBundle({
      includeMethod: true,
      includePath: true,
      includeStatusCode: true,
      includeUp: true,
      customLabels: {
        app_name: 'zephix_user_auth_service',
        service_version: process.env['APP_VERSION'] || '1.0.0',
        environment: process.env['NODE_ENV'] || 'development'
      },
      transformLabels: (labels: any) => {
        // Ensure all label names are valid Prometheus label names
        const validLabels: any = {};
        Object.keys(labels).forEach(key => {
          // Convert any invalid characters to underscores
          const validKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
          validLabels[validKey] = labels[key];
        });
        return validLabels;
      },
      promClient: {
        collectDefaultMetrics: {
          register: register // Use the same register to avoid conflicts
        }
      },
      normalizePath: (req: any) => {
        // Normalize paths for better metrics aggregation
        const path = req.path;
        if (path.startsWith('/api/auth/')) {
          return '/api/auth/*';
        }
        if (path.startsWith('/health')) {
          return '/health/*';
        }
        return path;
      }
    });

    // Initialize HTTP metrics with valid label names
    this.httpRequestDuration = new Histogram({
      name: 'zephix_auth_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [register]
    });

    this.httpRequestTotal = new Counter({
      name: 'zephix_auth_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register]
    });

    this.httpRequestErrors = new Counter({
      name: 'zephix_auth_http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'route', 'status_code', 'error_type'],
      registers: [register]
    });

    // Initialize business metrics with valid label names
    this.userRegistrations = new Counter({
      name: 'zephix_auth_user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['role', 'mfa_enabled'],
      registers: [register]
    });

    this.userLogins = new Counter({
      name: 'zephix_auth_user_logins_total',
      help: 'Total number of successful user logins',
      labelNames: ['mfa_used', 'remember_me'],
      registers: [register]
    });

    this.userLoginsFailed = new Counter({
      name: 'zephix_auth_user_login_failures_total',
      help: 'Total number of failed login attempts',
      labelNames: ['failure_reason'],
      registers: [register]
    });

    this.passwordResets = new Counter({
      name: 'zephix_auth_password_resets_total',
      help: 'Total number of password reset requests',
      labelNames: ['status'],
      registers: [register]
    });

    this.mfaSetups = new Counter({
      name: 'zephix_auth_mfa_setups_total',
      help: 'Total number of MFA setups',
      labelNames: ['status'],
      registers: [register]
    });

    this.mfaVerifications = new Counter({
      name: 'zephix_auth_mfa_verifications_total',
      help: 'Total number of MFA verifications',
      labelNames: ['status'],
      registers: [register]
    });

    // Initialize system metrics with valid label names
    this.activeUsers = new Gauge({
      name: 'zephix_auth_active_users',
      help: 'Number of active users',
      labelNames: ['status'],
      registers: [register]
    });

    this.databaseConnections = new Gauge({
      name: 'zephix_auth_database_connections',
      help: 'Number of active database connections',
      labelNames: ['state'],
      registers: [register]
    });

    this.redisConnections = new Gauge({
      name: 'zephix_auth_redis_connections',
      help: 'Number of active Redis connections',
      labelNames: ['state'],
      registers: [register]
    });

    this.memoryUsage = new Gauge({
      name: 'zephix_auth_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [register]
    });

    this.cpuUsage = new Gauge({
      name: 'zephix_auth_cpu_usage_percent',
      help: 'CPU usage percentage',
      labelNames: ['type'],
      registers: [register]
    });

    this.logger.info('Metrics service initialized successfully');
  }

  /**
   * Gets the Prometheus metrics middleware
   * @returns {any} Express middleware for metrics collection
   */
  getMetricsMiddleware(): any {
    return this.metricsMiddleware;
  }

  /**
   * Records a user registration event
   * @param {string} role - User role
   * @param {boolean} mfaEnabled - Whether MFA is enabled
   */
  recordUserRegistration(role: string, mfaEnabled: boolean): void {
    this.userRegistrations.inc({ role, mfa_enabled: mfaEnabled.toString() });
    this.logger.debug('User registration recorded', { role, mfaEnabled });
  }

  /**
   * Records a successful user login
   * @param {boolean} mfaUsed - Whether MFA was used
   * @param {boolean} rememberMe - Whether remember me was used
   */
  recordUserLogin(mfaUsed: boolean, rememberMe: boolean): void {
    this.userLogins.inc({ 
      mfa_used: mfaUsed.toString(), 
      remember_me: rememberMe.toString() 
    });
    this.logger.debug('User login recorded', { mfaUsed, rememberMe });
  }

  /**
   * Records a failed login attempt
   * @param {string} reason - Reason for failure
   */
  recordLoginFailure(reason: string): void {
    this.userLoginsFailed.inc({ failure_reason: reason });
    this.logger.debug('Login failure recorded', { reason });
  }

  /**
   * Records a password reset request
   * @param {string} status - Status of the reset request
   */
  recordPasswordReset(status: string): void {
    this.passwordResets.inc({ status });
    this.logger.debug('Password reset recorded', { status });
  }

  /**
   * Records an MFA setup event
   * @param {string} status - Status of the setup
   */
  recordMFASetup(status: string): void {
    this.mfaSetups.inc({ status });
    this.logger.debug('MFA setup recorded', { status });
  }

  /**
   * Records an MFA verification event
   * @param {string} status - Status of the verification
   */
  recordMFAVerification(status: string): void {
    this.mfaVerifications.inc({ status });
    this.logger.debug('MFA verification recorded', { status });
  }

  /**
   * Updates active users count
   * @param {string} status - User status
   * @param {number} count - Number of users
   */
  updateActiveUsers(status: string, count: number): void {
    this.activeUsers.set({ status }, count);
    this.logger.debug('Active users updated', { status, count });
  }

  /**
   * Updates database connection count
   * @param {string} state - Connection state
   * @param {number} count - Number of connections
   */
  updateDatabaseConnections(state: string, count: number): void {
    this.databaseConnections.set({ state }, count);
    this.logger.debug('Database connections updated', { state, count });
  }

  /**
   * Updates Redis connection count
   * @param {string} state - Connection state
   * @param {number} count - Number of connections
   */
  updateRedisConnections(state: string, count: number): void {
    this.redisConnections.set({ state }, count);
    this.logger.debug('Redis connections updated', { state, count });
  }

  /**
   * Updates memory usage metrics
   */
  updateMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    
    this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
    this.memoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
    this.memoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
    this.memoryUsage.set({ type: 'external' }, memUsage.external);
    
    this.logger.debug('Memory usage updated', { memUsage });
  }

  /**
   * Updates CPU usage metrics
   */
  updateCPUUsage(): void {
    const cpuUsage = process.cpuUsage();
    const totalCPU = cpuUsage.user + cpuUsage.system;
    
    this.cpuUsage.set({ type: 'user' }, cpuUsage.user);
    this.cpuUsage.set({ type: 'system' }, cpuUsage.system);
    this.cpuUsage.set({ type: 'total' }, totalCPU);
    
    this.logger.debug('CPU usage updated', { cpuUsage });
  }

  /**
   * Records HTTP request duration
   * @param {string} method - HTTP method
   * @param {string} route - Request route
   * @param {number} statusCode - Response status code
   * @param {number} duration - Request duration in seconds
   */
  recordHTTPRequestDuration(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration);
    this.logger.debug('HTTP request duration recorded', { method, route, statusCode, duration });
  }

  /**
   * Records HTTP request count
   * @param {string} method - HTTP method
   * @param {string} route - Request route
   * @param {number} statusCode - Response status code
   */
  recordHTTPRequest(method: string, route: string, statusCode: number): void {
    this.httpRequestTotal.inc({ method, route, status_code: statusCode.toString() });
    this.logger.debug('HTTP request recorded', { method, route, statusCode });
  }

  /**
   * Records HTTP error
   * @param {string} method - HTTP method
   * @param {string} route - Request route
   * @param {number} statusCode - Response status code
   * @param {string} errorType - Type of error
   */
  recordHTTPError(method: string, route: string, statusCode: number, errorType: string): void {
    this.httpRequestErrors.inc({ 
      method, 
      route, 
      status_code: statusCode.toString(), 
      error_type: errorType 
    });
    this.logger.debug('HTTP error recorded', { method, route, statusCode, errorType });
  }

  /**
   * Gets all metrics as a string for Prometheus scraping
   * @returns {Promise<string>} Metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    try {
      const metrics = await register.metrics();
      this.logger.debug('Metrics collected successfully');
      return metrics;
    } catch (error) {
      this.logger.error('Failed to collect metrics', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Resets all metrics (useful for testing)
   */
  resetMetrics(): void {
    register.clear();
    this.logger.info('All metrics reset');
  }

  /**
   * Gets metrics summary for health checks
   * @returns {Object} Metrics summary
   */
  getMetricsSummary(): {
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    activeUsers: number;
    memoryUsage: number;
  } {
    // This is a simplified summary - in production you'd calculate from actual metrics
    return {
      totalRequests: 0, // Would be calculated from actual metrics
      errorRate: 0,
      averageResponseTime: 0,
      activeUsers: 0,
      memoryUsage: process.memoryUsage().heapUsed
    };
  }
}

/**
 * Global metrics service instance
 */
export const metricsService = new MetricsService(); 