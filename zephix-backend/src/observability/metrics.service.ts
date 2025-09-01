import { Injectable, Logger } from '@nestjs/common';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  // HTTP Request Metrics
  public readonly httpRequestsTotal: Counter;
  public readonly httpRequestDuration: Histogram;
  public readonly httpRequestSizeBytes: Histogram;
  public readonly httpResponseSizeBytes: Histogram;

  // System Metrics
  public readonly activeConnections: Gauge;
  public readonly memoryUsageBytes: Gauge;

  // Error Metrics
  public readonly errorsTotal: Counter;

  // BRD-specific Metrics
  public readonly brdOperationsTotal: Counter;
  public readonly brdStatusTransitions: Counter;

  // Database Metrics
  public readonly databaseQueriesTotal: Counter;
  public readonly databaseQueryDuration: Histogram;

  // Authentication Metrics
  public readonly authAttemptsTotal: Counter;

  // Search Metrics
  public readonly searchQueriesTotal: Counter;
  public readonly searchQueryDuration: Histogram;

  constructor() {
    this.logger.log('Initializing MetricsService with duplicate registration prevention');
    
    // Check if default metrics are already collected
    if (!register.getSingleMetric('process_cpu_seconds_total')) {
      this.logger.debug('Collecting default metrics');
      collectDefaultMetrics({ register });
    } else {
      this.logger.debug('Default metrics already collected, skipping');
    }

    // HTTP Request Metrics
    const existingHttpRequestsTotal = register.getSingleMetric('http_requests_total');
    if (existingHttpRequestsTotal) {
      this.logger.debug('Reusing existing http_requests_total metric');
      this.httpRequestsTotal = existingHttpRequestsTotal as Counter;
    } else {
      this.logger.debug('Creating new http_requests_total metric');
      this.httpRequestsTotal = new Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code', 'organizationId'],
      });
    }

    const existingHttpRequestDuration = register.getSingleMetric('http_request_duration_seconds');
    if (existingHttpRequestDuration) {
      this.logger.debug('Reusing existing http_request_duration_seconds metric');
      this.httpRequestDuration = existingHttpRequestDuration as Histogram;
    } else {
      this.logger.debug('Creating new http_request_duration_seconds metric');
      this.httpRequestDuration = new Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      });
    }

    const existingHttpRequestSizeBytes = register.getSingleMetric('http_request_size_bytes');
    if (existingHttpRequestSizeBytes) {
      this.logger.debug('Reusing existing http_request_size_bytes metric');
      this.httpRequestSizeBytes = existingHttpRequestSizeBytes as Histogram;
    } else {
      this.logger.debug('Creating new http_request_size_bytes metric');
      this.httpRequestSizeBytes = new Histogram({
        name: 'http_request_size_bytes',
        help: 'Size of HTTP requests in bytes',
        labelNames: ['method', 'route'],
        buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
      });
    }

    const existingHttpResponseSizeBytes = register.getSingleMetric('http_response_size_bytes');
    if (existingHttpResponseSizeBytes) {
      this.logger.debug('Reusing existing http_response_size_bytes metric');
      this.httpResponseSizeBytes = existingHttpResponseSizeBytes as Histogram;
    } else {
      this.logger.debug('Creating new http_response_size_bytes metric');
      this.httpResponseSizeBytes = new Histogram({
        name: 'http_response_size_bytes',
        help: 'Size of HTTP responses in bytes',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
      });
    }

    // System Metrics
    const existingActiveConnections = register.getSingleMetric('active_connections');
    if (existingActiveConnections) {
      this.logger.debug('Reusing existing active_connections metric');
      this.activeConnections = existingActiveConnections as Gauge;
    } else {
      this.logger.debug('Creating new active_connections metric');
      this.activeConnections = new Gauge({
        name: 'active_connections',
        help: 'Number of active connections',
        labelNames: ['type'],
      });
    }

    const existingMemoryUsageBytes = register.getSingleMetric('memory_usage_bytes');
    if (existingMemoryUsageBytes) {
      this.logger.debug('Reusing existing memory_usage_bytes metric');
      this.memoryUsageBytes = existingMemoryUsageBytes as Gauge;
    } else {
      this.logger.debug('Creating new memory_usage_bytes metric');
      this.memoryUsageBytes = new Gauge({
        name: 'memory_usage_bytes',
        help: 'Memory usage in bytes',
        labelNames: ['type'],
      });
    }

    // Error Metrics
    const existingErrorsTotal = register.getSingleMetric('errors_total');
    if (existingErrorsTotal) {
      this.logger.debug('Reusing existing errors_total metric');
      this.errorsTotal = existingErrorsTotal as Counter;
    } else {
      this.logger.debug('Creating new errors_total metric');
      this.errorsTotal = new Counter({
        name: 'errors_total',
        help: 'Total number of errors',
        labelNames: ['type', 'service', 'organizationId'],
      });
    }

    // BRD-specific Metrics
    const existingBrdOperationsTotal = register.getSingleMetric('brd_operations_total');
    if (existingBrdOperationsTotal) {
      this.logger.debug('Reusing existing brd_operations_total metric');
      this.brdOperationsTotal = existingBrdOperationsTotal as Counter;
    } else {
      this.logger.debug('Creating new brd_operations_total metric');
      this.brdOperationsTotal = new Counter({
        name: 'brd_operations_total',
        help: 'Total number of BRD operations',
        labelNames: ['operation', 'status', 'organizationId'],
      });
    }

    const existingBrdStatusTransitions = register.getSingleMetric('brd_status_transitions_total');
    if (existingBrdStatusTransitions) {
      this.logger.debug('Reusing existing brd_status_transitions_total metric');
      this.brdStatusTransitions = existingBrdStatusTransitions as Counter;
    } else {
      this.logger.debug('Creating new brd_status_transitions_total metric');
      this.brdStatusTransitions = new Counter({
        name: 'brd_status_transitions_total',
        help: 'Total number of BRD status transitions',
        labelNames: ['from_status', 'to_status', 'organizationId'],
      });
    }

    // Database Metrics
    const existingDatabaseQueriesTotal = register.getSingleMetric('database_queries_total');
    if (existingDatabaseQueriesTotal) {
      this.logger.debug('Reusing existing database_queries_total metric');
      this.databaseQueriesTotal = existingDatabaseQueriesTotal as Counter;
    } else {
      this.logger.debug('Creating new database_queries_total metric');
      this.databaseQueriesTotal = new Counter({
        name: 'database_queries_total',
        help: 'Total number of database queries',
        labelNames: ['operation', 'table', 'organizationId'],
      });
    }

    const existingDatabaseQueryDuration = register.getSingleMetric('database_query_duration_seconds');
    if (existingDatabaseQueryDuration) {
      this.logger.debug('Reusing existing database_query_duration_seconds metric');
      this.databaseQueryDuration = existingDatabaseQueryDuration as Histogram;
    } else {
      this.logger.debug('Creating new database_query_duration_seconds metric');
      this.databaseQueryDuration = new Histogram({
        name: 'database_query_duration_seconds',
        help: 'Duration of database queries in seconds',
        labelNames: ['operation', 'table'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      });
    }

    // Authentication Metrics
    const existingAuthAttemptsTotal = register.getSingleMetric('auth_attempts_total');
    if (existingAuthAttemptsTotal) {
      this.logger.debug('Reusing existing auth_attempts_total metric');
      this.authAttemptsTotal = existingAuthAttemptsTotal as Counter;
    } else {
      this.logger.debug('Creating new auth_attempts_total metric');
      this.authAttemptsTotal = new Counter({
        name: 'auth_attempts_total',
        help: 'Total number of authentication attempts',
        labelNames: ['result', 'organizationId'],
      });
    }

    // Search Metrics
    const existingSearchQueriesTotal = register.getSingleMetric('search_queries_total');
    if (existingSearchQueriesTotal) {
      this.logger.debug('Reusing existing search_queries_total metric');
      this.searchQueriesTotal = existingSearchQueriesTotal as Counter;
    } else {
      this.logger.debug('Creating new search_queries_total metric');
      this.searchQueriesTotal = new Counter({
        name: 'search_queries_total',
        help: 'Total number of search queries',
        labelNames: ['type', 'organizationId'],
      });
    }

    const existingSearchQueryDuration = register.getSingleMetric('search_query_duration_seconds');
    if (existingSearchQueryDuration) {
      this.logger.debug('Reusing existing search_query_duration_seconds metric');
      this.searchQueryDuration = existingSearchQueryDuration as Histogram;
    } else {
      this.logger.debug('Creating new search_query_duration_seconds metric');
      this.searchQueryDuration = new Histogram({
        name: 'search_query_duration_seconds',
        help: 'Duration of search queries in seconds',
        labelNames: ['type'],
        buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      });
    }

    this.logger.log('MetricsService initialized successfully with duplicate registration prevention');
  }

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
   * Record HTTP request size metrics
   */
  recordHttpRequestSize(method: string, route: string, sizeBytes: number): void {
    try {
      this.httpRequestSizeBytes.observe({ method, route }, sizeBytes);
    } catch (error) {
      this.logger.error('Failed to record HTTP request size metrics', error);
    }
  }

  /**
   * Record HTTP response size metrics
   */
  recordHttpResponseSize(method: string, route: string, statusCode: number, sizeBytes: number): void {
    try {
      this.httpResponseSizeBytes.observe(
        { method, route, status_code: statusCode.toString() },
        sizeBytes
      );
    } catch (error) {
      this.logger.error('Failed to record HTTP response size metrics', error);
    }
  }

  /**
   * Set active connections count
   */
  setActiveConnections(type: string, count: number): void {
    try {
      this.activeConnections.set({ type }, count);
    } catch (error) {
      this.logger.error('Failed to set active connections metric', error);
    }
  }

  /**
   * Set memory usage
   */
  setMemoryUsage(type: string, bytes: number): void {
    try {
      this.memoryUsageBytes.set({ type }, bytes);
    } catch (error) {
      this.logger.error('Failed to set memory usage metric', error);
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
   * Get workflow metrics for a specific organization and date range
   */
  async getWorkflowMetrics(
    organizationId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<any> {
    try {
      // This is a placeholder implementation
      // In a real system, this would query the metrics store
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageDuration: 0,
        organizationId,
        dateRange
      };
    } catch (error) {
      this.logger.error('Failed to get workflow metrics', error);
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageDuration: 0,
        organizationId,
        dateRange
      };
    }
  }

  /**
   * Record bulk operation metrics
   */
  async recordBulkOperation(data: {
    operationType: string;
    organizationId: string;
    totalProcessed: number;
    totalSucceeded: number;
    totalFailed: number;
    processingTime?: number;
    averageTimePerItem?: number;
    timestamp?: Date;
  }): Promise<void> {
    try {
      // This is a placeholder implementation
      // In a real system, this would record to the metrics store
      this.logger.log(`Bulk operation recorded: ${data.operationType}`, data);
    } catch (error) {
      this.logger.error('Failed to record bulk operation metrics', error);
    }
  }

  /**
   * Update real-time metrics
   */
  async updateRealTimeMetrics(
    metricType: string,
    data: {
      organizationId: string;
      metrics: any;
      timestamp: Date;
    }
  ): Promise<void> {
    try {
      // This is a placeholder implementation
      // In a real system, this would update real-time metrics
      this.logger.log(`Real-time metrics updated: ${metricType}`, data);
    } catch (error) {
      this.logger.error('Failed to update real-time metrics', error);
    }
  }

  /**
   * Record cache metrics
   */
  async recordCacheMetrics(data: {
    hits: number;
    misses: number;
    hitRate: number;
    totalRequests: number;
    averageResponseTime: number;
    memoryUsage: number;
    evictions: number;
    timestamp: Date;
  }): Promise<void> {
    try {
      // This is a placeholder implementation
      // In a real system, this would record cache metrics
      this.logger.log(`Cache metrics recorded: hits=${data.hits}, misses=${data.misses}, hitRate=${data.hitRate}`, data);
    } catch (error) {
      this.logger.error('Failed to record cache metrics', error);
    }
  }
}
