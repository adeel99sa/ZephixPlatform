import { Injectable } from '@nestjs/common';
import {
  register,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService {
  // HTTP Request Metrics
  public readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'organizationId'],
  });

  public readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  });

  // Error Metrics
  public readonly errorsTotal = new Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'service', 'organizationId'],
  });

  // BRD-specific Metrics
  public readonly brdOperationsTotal = new Counter({
    name: 'brd_operations_total',
    help: 'Total number of BRD operations',
    labelNames: ['operation', 'status', 'organizationId'],
  });

  public readonly brdStatusTransitions = new Counter({
    name: 'brd_status_transitions_total',
    help: 'Total number of BRD status transitions',
    labelNames: ['from_status', 'to_status', 'organizationId'],
  });

  // Database Metrics
  public readonly databaseQueriesTotal = new Counter({
    name: 'database_queries_total',
    help: 'Total number of database queries',
    labelNames: ['operation', 'table', 'organizationId'],
  });

  public readonly databaseQueryDuration = new Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  });

  // Queue Metrics (for future BullMQ integration)
  public readonly queueJobsTotal = new Counter({
    name: 'queue_jobs_total',
    help: 'Total number of queue jobs',
    labelNames: ['queue', 'status'],
  });

  public readonly queueSize = new Gauge({
    name: 'queue_size',
    help: 'Current size of job queues',
    labelNames: ['queue'],
  });

  // Authentication Metrics
  public readonly authAttemptsTotal = new Counter({
    name: 'auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['result', 'organizationId'],
  });

  // Search Metrics
  public readonly searchQueriesTotal = new Counter({
    name: 'search_queries_total',
    help: 'Total number of search queries',
    labelNames: ['type', 'organizationId'],
  });

  public readonly searchQueryDuration = new Histogram({
    name: 'search_query_duration_seconds',
    help: 'Duration of search queries in seconds',
    labelNames: ['type'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  });

  constructor() {
    // Enable default metrics collection (CPU, memory, etc.)
    collectDefaultMetrics({ register });
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
  }

  /**
   * Record error metrics
   */
  recordError(type: string, service: string, organizationId?: string): void {
    this.errorsTotal.inc({
      type,
      service,
      organizationId: organizationId || 'unknown',
    });
  }

  /**
   * Record BRD operation metrics
   */
  recordBRDOperation(
    operation: 'create' | 'read' | 'update' | 'delete' | 'search',
    status: 'success' | 'error',
    organizationId: string,
  ): void {
    this.brdOperationsTotal.inc({
      operation,
      status,
      organizationId: organizationId,
    });
  }

  /**
   * Record BRD status transition metrics
   */
  recordBRDStatusTransition(
    fromStatus: string,
    toStatus: string,
    organizationId: string,
  ): void {
    this.brdStatusTransitions.inc({
      from_status: fromStatus,
      to_status: toStatus,
      organizationId: organizationId,
    });
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
    this.databaseQueriesTotal.inc({
      operation,
      table,
      organizationId: organizationId || 'unknown',
    });

    this.databaseQueryDuration.observe({ operation, table }, duration);
  }

  /**
   * Record authentication attempt metrics
   */
  recordAuthAttempt(
    result: 'success' | 'failure',
    organizationId?: string,
  ): void {
    this.authAttemptsTotal.inc({
      result,
      organizationId: organizationId || 'unknown',
    });
  }

  /**
   * Record search query metrics
   */
  recordSearchQuery(
    type: 'fulltext' | 'filter' | 'aggregate',
    duration: number,
    organizationId: string,
  ): void {
    this.searchQueriesTotal.inc({
      type,
      organizationId: organizationId,
    });

    this.searchQueryDuration.observe({ type }, duration);
  }

  /**
   * Update queue size metrics
   */
  updateQueueSize(queueName: string, size: number): void {
    this.queueSize.set({ queue: queueName }, size);
  }

  /**
   * Record queue job metrics
   */
  recordQueueJob(
    queueName: string,
    status: 'completed' | 'failed' | 'delayed',
  ): void {
    this.queueJobsTotal.inc({
      queue: queueName,
      status,
    });
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    register.clear();
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
    // Map to existing counter with different labels
    this.errorsTotal.inc({
      type: `llm_${status}`,
      service: `${provider}_${model}`,
      organizationId: 'system',
    });
  }

  /**
   * Observe LLM duration (legacy method)
   */
  observeLlmDuration(provider: string, model: string, duration: number): void {
    // Map to existing histogram
    this.httpRequestDuration.observe(
      { method: 'POST', route: `/llm/${provider}`, status_code: '200' },
      duration,
    );
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
    this.queueSize.set({ queue: 'database_connections' }, count);
  }
}
