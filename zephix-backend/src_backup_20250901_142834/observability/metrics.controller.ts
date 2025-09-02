import { Controller, Get, Header } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Observability')
@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  @ApiExcludeEndpoint() // Exclude from Swagger docs for security
  @ApiOperation({
    summary: 'Prometheus metrics endpoint',
    description:
      'Exposes application metrics in Prometheus format for monitoring and alerting',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics in Prometheus format',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example: `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/pm/brds",status_code="200",organizationId="org-1"} 42

# HELP brd_operations_total Total number of BRD operations
# TYPE brd_operations_total counter
brd_operations_total{operation="create",status="success",organizationId="org-1"} 15`,
        },
      },
    },
  })
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  @Get('health/metrics')
  @ApiOperation({
    summary: 'Metrics health check',
    description:
      'Returns basic health information about the metrics collection system',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics system health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00Z' },
        metrics_collected: { type: 'number', example: 156 },
        uptime_seconds: { type: 'number', example: 3600 },
      },
    },
  })
  async getMetricsHealth() {
    const metricsString = await this.metricsService.getMetrics();
    const metricsCount = (metricsString.match(/^[^#]/gm) || []).length;

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics_collected: metricsCount,
      uptime_seconds: process.uptime(),
    };
  }
}
