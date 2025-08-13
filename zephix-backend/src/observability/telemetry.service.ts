import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

@Injectable()
export class TelemetryService implements OnModuleInit {
  private sdk: NodeSDK;
  private tracer = trace.getTracer('zephix-backend');

  constructor(private configService: ConfigService) {
    this.initializeSDK();
  }

  private initializeSDK() {
    const serviceName = 'zephix-backend';
    const serviceVersion =
      this.configService.get<string>('npm_package_version') || '1.0.0';
    const environment =
      this.configService.get<string>('environment') || 'development';

    this.sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
      }),
      instrumentations: [
        new HttpInstrumentation({
          // Custom request hook to add more context
          requestHook: (span, request) => {
            const req = request as any;
            span.setAttributes({
              'http.request.body.size': req.headers?.['content-length'] || 0,
              'http.user_agent': req.headers?.['user-agent'] || 'unknown',
            });
          },
          // Custom response hook to add response context
          responseHook: (span, response) => {
            const res = response as any;
            span.setAttributes({
              'http.response.body.size': res.headers?.['content-length'] || 0,
            });
          },
        }),
        new ExpressInstrumentation({
          // Add request ID to spans
          requestHook: (span, info) => {
            const req = info.request;
            if (req.requestId) {
              span.setAttributes({
                'request.id': req.requestId,
              });
            }
          },
        }),
        new NestInstrumentation(),
      ],
    });
  }

  async onModuleInit() {
    if (this.configService.get<boolean>('OTEL_ENABLED') !== false) {
      this.sdk.start();
      console.log('🔭 OpenTelemetry initialized successfully');
    }
  }

  // Create a custom span for business logic
  createSpan(name: string, attributes?: Record<string, any>) {
    const span = this.tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      attributes,
    });
    return span;
  }

  // Trace a function execution
  async traceFunction<T>(
    name: string,
    fn: () => Promise<T> | T,
    attributes?: Record<string, any>,
  ): Promise<T> {
    const span = this.createSpan(name, attributes);

    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    } finally {
      span.end();
    }
  }

  // Add attributes to current span
  addSpanAttributes(attributes: Record<string, any>) {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setAttributes(attributes);
    }
  }

  // Record an exception in current span
  recordException(error: Error) {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.recordException(error);
      currentSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  }

  async shutdown() {
    await this.sdk.shutdown();
  }
}
