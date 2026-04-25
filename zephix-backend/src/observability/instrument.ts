// IMPORTANT: This file must be imported FIRST in main.ts, before any other imports.
// Sentry must initialize before NestJS bootstraps to instrument all subsequent code.

import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  const environment =
    process.env.ZEPHIX_ENV || process.env.NODE_ENV || 'unknown';
  const release =
    process.env.SENTRY_RELEASE ||
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    'unknown';

  Sentry.init({
    dsn,
    environment,
    release,

    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    profileSessionSampleRate: 1.0,
    profileLifecycle: 'trace',

    sendDefaultPii: true,

    beforeSend(event) {
      const url = event.request?.url || '';
      const sensitivePathsRegex = /\/(ai\/assist|field-notes|auth)/i;

      if (sensitivePathsRegex.test(url) && event.request) {
        event.request.data = '[REDACTED - sensitive endpoint]';
      }

      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.Authorization;
        delete event.request.headers.cookie;
        delete event.request.headers.Cookie;
        delete event.request.headers['x-api-key'];
        delete event.request.headers['X-Api-Key'];
      }

      return event;
    },

    ignoreErrors: [
      'Non-Error promise rejection captured',
      'Health check failed',
    ],
  });

  console.log(
    `[Sentry] Initialized - environment: ${environment}, release: ${release}`,
  );
} else {
  console.log('[Sentry] No SENTRY_DSN configured, monitoring disabled');
}
