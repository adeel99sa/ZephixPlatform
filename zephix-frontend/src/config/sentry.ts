import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Initialize Sentry
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';
  const release = import.meta.env.VITE_SENTRY_RELEASE || '1.0.0';

  if (!dsn) {
    console.warn('Sentry DSN not found. Error tracking disabled.');
    return;
  }

  // Temporarily disable Sentry for build compatibility
  console.warn('Sentry initialization disabled for build compatibility');
  return;

  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [
      new BrowserTracing({
        // Set sampling rate for performance monitoring
        // 0.1 = 10% of transactions, 1.0 = 100%
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
      }),
    ],
    // Set sampling rate for error monitoring
    // 0.1 = 10% of errors, 1.0 = 100%
    sampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Configure beforeSend to filter out certain errors
    beforeSend(event, _hint) {
      // Don't send errors from localhost in development
      if (environment === 'development' && window.location.hostname === 'localhost') {
        return null;
      }

      // Filter out network errors that are not critical
      if (event.exception) {
        const exception = event.exception.values?.[0];
        if (exception?.type === 'NetworkError' && exception.value?.includes('fetch')) {
          return null;
        }
      }

      return event;
    },

    // Configure beforeBreadcrumb to add custom context
    beforeBreadcrumb(breadcrumb, _hint) {
      // Add user context to breadcrumbs
      const scope = Sentry.getCurrentHub().getScope();
      const user = scope?.getUser();
      if (user) {
        breadcrumb.data = {
          ...breadcrumb.data,
          userId: user.id,
          userEmail: user.email,
        };
      }

      return breadcrumb;
    },

    // Enable debug mode in development
    debug: environment === 'development',
  });

  console.log(`Sentry initialized for environment: ${environment}`);
};

// Set user context for Sentry
export const setSentryUser = (user: { id: string; email: string; name?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
};

// Clear user context
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

// Add breadcrumb for user actions
export const addSentryBreadcrumb = (
  message: string,
  category: string = 'user',
  data?: Record<string, unknown>
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

// Capture error with context
export const captureSentryError = (
  error: Error,
  context?: Record<string, unknown>,
  tags?: Record<string, string>
) => {
  Sentry.captureException(error, {
    contexts: {
      app: context,
    },
    tags,
  });
};

// Capture message with context
export const captureSentryMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
) => {
  Sentry.captureMessage(message, {
    level,
    contexts: {
      app: context,
    },
  });
};

// Start performance transaction
export const startSentryTransaction = (
  name: string,
  operation: string,
  data?: Record<string, unknown>
) => {
  const hub = Sentry.getCurrentHub();
  const transaction = hub.startTransaction({
    name,
    op: operation,
    data,
  });
  return transaction;
};

// Set Sentry tags for better filtering
export const setSentryTags = (tags: Record<string, string>) => {
  Sentry.setTags(tags);
};

// Set Sentry context for better debugging
export const setSentryContext = (name: string, context: Record<string, unknown>) => {
  Sentry.setContext(name, context);
};
