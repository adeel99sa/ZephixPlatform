import { Counter, Histogram, Gauge, register, collectDefaultMetrics } from 'prom-client';

// Check if metrics exist before creating them - Singleton Pattern
export const httpRequestsTotal = register.getSingleMetric('http_requests_total') as Counter || 
  new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'organizationId'],
  });

export const httpRequestDuration = register.getSingleMetric('http_request_duration_seconds') as Histogram ||
  new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  });

export const errorsTotal = register.getSingleMetric('errors_total') as Counter ||
  new Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'service', 'organizationId'],
  });

export const brdOperationsTotal = register.getSingleMetric('brd_operations_total') as Counter ||
  new Counter({
    name: 'brd_operations_total',
    help: 'Total number of BRD operations',
    labelNames: ['operation', 'status', 'organizationId'],
  });

export const brdStatusTransitions = register.getSingleMetric('brd_status_transitions_total') as Counter ||
  new Counter({
    name: 'brd_status_transitions_total',
    help: 'Total number of BRD status transitions',
    labelNames: ['from_status', 'to_status', 'organizationId'],
  });

export const databaseQueriesTotal = register.getSingleMetric('database_queries_total') as Counter ||
  new Counter({
    name: 'database_queries_total',
    help: 'Total number of database queries',
    labelNames: ['operation', 'table', 'organizationId'],
  });

export const databaseQueryDuration = register.getSingleMetric('database_query_duration_seconds') as Histogram ||
  new Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  });

export const authAttemptsTotal = register.getSingleMetric('auth_attempts_total') as Counter ||
  new Counter({
    name: 'auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['result', 'organizationId'],
  });

export const searchQueriesTotal = register.getSingleMetric('search_queries_total') as Counter ||
  new Counter({
    name: 'search_queries_total',
    help: 'Total number of search queries',
    labelNames: ['type', 'organizationId'],
  });

export const searchQueryDuration = register.getSingleMetric('search_query_duration_seconds') as Histogram ||
  new Histogram({
    name: 'search_query_duration_seconds',
    help: 'Duration of search queries in seconds',
    labelNames: ['type'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  });

// Enable default metrics collection only once
if (!register.getSingleMetric('process_cpu_seconds_total')) {
  collectDefaultMetrics({ register });
}
