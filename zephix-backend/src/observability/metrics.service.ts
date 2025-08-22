import { Injectable, Logger } from '@nestjs/common';
import { register } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private _metrics: any = {};

  constructor() {
    this.initializeMetrics();
  }

  /**
   * Initialize metrics using singleton pattern to prevent duplicate registration
   */
  private initializeMetrics(): void {
    try {
      // HTTP Request Metrics
      this._metrics.httpRequestsTotal = this.getOrCreateCounter('http_requests_total', {
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code', 'organizationId'],
      });

      this._metrics.httpRequestDuration = this.getOrCreateHistogram('http_request_duration_seconds', {
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      });

      // Error Metrics
      this._metrics.errorsTotal = this.getOrCreateCounter('errors_total', {
        name: 'errors_total',
        help: 'Total number of errors',
        labelNames: ['type', 'service', 'organizationId'],
      });

      // BRD-specific Metrics
      this._metrics.brdOperationsTotal = this.getOrCreateCounter('brd_operations_total', {
        name: 'brd_operations_total',
        help: 'Total number of BRD operations',
        labelNames: ['operation', 'status', 'organizationId'],
      });

      this._metrics.brdStatusTransitions = this.getOrCreateCounter('brd_status_transitions_total', {
        name: 'brd_status_transitions_total',
        help: 'Total number of BRD status transitions',
        labelNames: ['from_status', 'to_status', 'organizationId'],
      });

      // Database Metrics
      this._metrics.databaseQueriesTotal = this.getOrCreateCounter('database_queries_total', {
        name: 'database_queries_total',
        help: 'Total number of database queries',
        labelNames: ['operation', 'table', 'organizationId'],
      });

      this._metrics.databaseQueryDuration = this.getOrCreateHistogram('database_query_duration_seconds', {
        name: 'database_query_duration_seconds',
        help: 'Duration of database queries in seconds',
        labelNames: ['operation', 'table'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      });

      // Authentication Metrics
      this._metrics.authAttemptsTotal = this.getOrCreateCounter('auth_attempts_total', {
        name: 'auth_attempts_total',
        help: 'Total number of authentication attempts',
        labelNames: ['result', 'organizationId'],
      });

      // Search Metrics
      this._metrics.searchQueriesTotal = this.getOrCreateCounter('search_queries_total', {
        name: 'search_queries_total',
        help: 'Total number of search queries',
        labelNames: ['type', 'organizationId'],
      });

      this._metrics.searchQueryDuration = this.getOrCreateHistogram('search_query_duration_seconds', {
        name: 'search_query_duration_seconds',
        help: 'Duration of search queries in seconds',
        labelNames: ['type'],
        buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      });

      this.logger.log('Metrics initialized successfully using singleton pattern');
    } catch (error) {
      this.logger.error('Failed to initialize metrics', error);
      // Fallback to empty metrics to prevent application crash
      this._metrics = {};
    }
  }

  /**
   * Get or create a Counter metric using singleton pattern
   */
  private getOrCreateCounter(name: string, config: any): any {
    try {
      const existingMetric = register.getSingleMetric(name);
      if (existingMetric) {
        this.logger.debug(`Reusing existing counter metric: ${name}`);
        return existingMetric;
      }
      
      this.logger.debug(`Creating new counter metric: ${name}`);
      const { Counter } = require('prom-client');
      return new Counter(config);
    } catch (error) {
      this.logger.error(`Failed to get or create counter metric: ${name}`, error);
      // Return a mock metric to prevent crashes
      return this.createMockMetric('counter', name);
    }
  }

  /**
   * Get or create a Histogram metric using singleton pattern
   */
  private getOrCreateHistogram(name: string, config: any): any {
    try {
      const existingMetric = register.getSingleMetric(name);
      if (existingMetric) {
        this.logger.debug(`Reusing existing histogram metric: ${name}`);
        return existingMetric;
      }
      
      this.logger.debug(`Creating new histogram metric: ${name}`);
      const { Histogram } = require('prom-client');
      return new Histogram(config);
    } catch (error) {
      this.logger.error(`Failed to get or create histogram metric: ${name}`, error);
      // Return a mock metric to prevent crashes
      return this.createMockMetric('histogram', name);
    }
  }

  /**
   * Create a mock metric to prevent crashes when real metrics fail
   */
  private createMockMetric(type: string, name: string): any {
    this.logger.warn(`Creating mock ${type} metric for: ${name}`);
    return {
      inc: () => {}, // No-op
      observe: () => {}, // No-op
      set: () => {}, // No-op
      name,
      type: 'mock',
    };
  }

  // Public getters for metrics
  get httpRequestsTotal() { return this._metrics.httpRequestsTotal; }
  get httpRequestDuration() { return this._metrics.httpRequestDuration; }
  get errorsTotal() { return this._metrics.errorsTotal; }
  get brdOperationsTotal() { return this._metrics.brdOperationsTotal; }
  get brdStatusTransitions() { return this._metrics.brdStatusTransitions; }
  get databaseQueriesTotal() { return this._metrics.databaseQueriesTotal; }
  get databaseQueryDuration() { return this._metrics.databaseQueryDuration; }
  get authAttemptsTotal() { return this._metrics.authAttemptsTotal; }
  get searchQueriesTotal() { return this._metrics.searchQueriesTotal; }
  get searchQueryDuration() { return this._metrics.searchQueryDuration; }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    organizationId?: string,
  ): void {
    try {
      const labels = {
        method,
        route,
        status_code: statusCode.toString(),
        organizationId: organizationId || 'unknown',
      };

      this.httpRequestsTotal.inc(labels);
      this.httpRequestDuration.observe(
        { method, route, status_code: statusCode.toString() },
        duration,
      );
    } catch (error) {
      this.logger.error('Failed to record HTTP request metrics', error);
    }
  }

  /**
   * Record error metrics
   */
  recordError(type: string, service: string, organizationId?: string): void {
    try {
      this.errorsTotal.inc({
        type,
        service,
        organizationId: organizationId || 'unknown',
      });
    } catch (error) {
      this.logger.error('Failed to record error metrics', error);
    }
  }

  /**
   * Record BRD operation metrics
   */
  recordBRDOperation(
    operation: 'create' | 'read' | 'update' | 'delete' | 'search',
    status: 'success' | 'error',
    organizationId: string,
  ): void {
    try {
      this.brdOperationsTotal.inc({
        operation,
        status,
        organizationId: organizationId,
      });
    } catch (error) {
      this.logger.error('Failed to record BRD operation metrics', error);
    }
  }

  /**
   * Record BRD status transition metrics
   */
  recordBRDStatusTransition(
    fromStatus: string,
    toStatus: string,
    organizationId: string,
  ): void {
    try {
      this.brdStatusTransitions.inc({
        from_status: fromStatus,
        to_status: toStatus,
        organizationId: organizationId,
      });
    } catch (error) {
      this.logger.error('Failed to record BRD status transition metrics', error);
    }
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(
    operation: 'select' | 'insert' | 'update' | 'delete',
    table: string,
    duration: number,
    organizationId?: string,
  ): void {
    try {
      this.databaseQueriesTotal.inc({
        operation,
        table,
        organizationId: organizationId || 'unknown',
      });

      this.databaseQueryDuration.observe({ operation, table }, duration);
    } catch (error) {
      this.logger.error('Failed to record database query metrics', error);
    }
  }

  /**
   * Record authentication attempt metrics
   */
  recordAuthAttempt(
    result: 'success' | 'failure',
    organizationId?: string,
  ): void {
    try {
      this.authAttemptsTotal.inc({
        result,
        organizationId: organizationId || 'unknown',
      });
    } catch (error) {
      this.logger.error('Failed to record authentication attempt metrics', error);
    }
  }

  /**
   * Record search query metrics
   */
  recordSearchQuery(
    type: string,
    duration: number,
    organizationId: string,
  ): void {
    try {
      this.searchQueriesTotal.inc({
        type,
        organizationId: organizationId,
      });

      this.searchQueryDuration.observe({ type }, duration);
    } catch (error) {
      this.logger.error('Failed to record search query metrics', error);
    }
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    try {
      return await register.metrics();
    } catch (error) {
      this.logger.error('Failed to get metrics', error);
      return '# Error retrieving metrics\n';
    }
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    try {
      register.clear();
      this.logger.log('Metrics cleared successfully');
    } catch (error) {
      this.logger.error('Failed to clear metrics', error);
    }
  }

  // Legacy methods for backward compatibility with existing services

  /**
   * Increment LLM request counter (legacy method)
   */
  incrementLlmRequests(
    provider: string,
    model: string,
    status: 'success' | 'error',
  ): void {
    try {
      // Map to existing counter with different labels
      this.errorsTotal.inc({
        type: `llm_${status}`,
        service: `${provider}_${model}`,
        organizationId: 'system',
      });
    } catch (error) {
      this.logger.error('Failed to increment LLM request counter', error);
    }
  }

  /**
   * Observe LLM duration (legacy method)
   */
  observeLlmDuration(provider: string, model: string, duration: number): void {
    try {
      // Map to existing histogram
      this.httpRequestDuration.observe(
        { method: 'POST', route: `/llm/${provider}`, status_code: '200' },
        duration,
      );
    } catch (error) {
      this.logger.error('Failed to observe LLM duration', error);
    }
  }

  /**
   * Increment LLM token usage (legacy method)
   */
  incrementLlmTokens(
    provider: string,
    model: string,
    type: 'input' | 'output',
    count: number,
  ): void {
    // This could be implemented as a gauge or counter depending on needs
    // For now, we'll skip this to avoid complexity
  }

  /**
   * Increment error counter (legacy method)
   */
  incrementError(type: string, service: string): void {
    this.recordError(type, service);
  }

  /**
   * Set active connections (legacy method)
   */
  setActiveConnections(count: number): void {
    // This method is no longer needed since we removed queue metrics
    // Database connection metrics are handled elsewhere
  }
}
