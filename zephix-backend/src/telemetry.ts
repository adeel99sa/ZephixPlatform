// This file must be imported first to initialize OpenTelemetry tracing
import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Only initialize if tracing is enabled
const isTracingEnabled = process.env.OTEL_ENABLED !== 'false';

if (isTracingEnabled) {
  const serviceName = process.env.OTEL_SERVICE_NAME || 'zephix-backend';
  const serviceVersion = process.env.npm_package_version || '1.0.0';
  const environment = process.env.NODE_ENV || 'development';

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
    }),
    instrumentations: [
      new HttpInstrumentation({
        // Don't trace health check endpoints to reduce noise
        ignoreIncomingRequestHook: (req) => {
          const url = req.url || '';
          return url.includes('/health') || url.includes('/_status');
        },
        // Add custom request attributes
        requestHook: (span, request) => {
          const req = request as any;
          span.setAttributes({
            'http.request.body.size': req.headers?.['content-length'] || 0,
            'http.user_agent': req.headers?.['user-agent'] || 'unknown',
          });
        },
        // Add custom response attributes
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
          const req = info.request as any;
          if (req.id) {
            span.setAttributes({
              'request.id': req.id,
              'user.tenant_id': req.user?.tenant_id || 'anonymous',
              'user.id': req.user?.sub || 'anonymous',
            });
          }
        },
      }),
      new NestInstrumentation(),
    ],
  });

  // Start the SDK
  sdk.start();
  
  console.log('🔭 OpenTelemetry SDK initialized');

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('OpenTelemetry terminated'))
      .catch((error) => console.log('Error terminating OpenTelemetry', error))
      .finally(() => process.exit(0));
  });
} else {
  console.log('🔭 OpenTelemetry disabled');
}
