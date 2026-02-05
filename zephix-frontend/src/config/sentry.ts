import * as Sentry from '@sentry/react';

// Initialize Sentry
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';

  if (!dsn) {
    console.warn('Sentry DSN not found. Error tracking disabled.');
    return;
  }

  // Temporarily disable Sentry for build compatibility
  console.warn('Sentry initialization disabled for build compatibility');
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

// Start performance transaction (no-op placeholder)
export const startSentryTransaction = (
  _name: string,
  _operation: string,
  _data?: Record<string, unknown>
) => {
  // Placeholder - Sentry transactions require proper initialization
  return null;
};

// Set Sentry tags for better filtering
export const setSentryTags = (tags: Record<string, string>) => {
  Sentry.setTags(tags);
};

// Set Sentry context for better debugging
export const setSentryContext = (name: string, context: Record<string, unknown>) => {
  Sentry.setContext(name, context);
};
