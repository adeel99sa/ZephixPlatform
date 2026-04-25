import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN

if (dsn) {
  const environment =
    import.meta.env.VITE_ZEPHIX_ENV || import.meta.env.MODE || 'unknown'
  const release = import.meta.env.VITE_SENTRY_RELEASE || 'unknown'

  Sentry.init({
    dsn,
    environment,
    release,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    tracePropagationTargets: [
      'localhost',
      /^https:\/\/zephix-backend-staging\.up\.railway\.app/,
      /^https:\/\/.*\.zephix\.app/,
    ],

    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    sendDefaultPii: true,

    beforeSend(event) {
      const sensitivePathsRegex = /\/(ai\/assist|field-notes|auth)/i

      if (event.request?.url && sensitivePathsRegex.test(event.request.url)) {
        event.request.data = '[REDACTED - sensitive endpoint]'
      }

      if (event.request?.headers) {
        delete event.request.headers.authorization
        delete event.request.headers.Authorization
        delete event.request.headers.cookie
        delete event.request.headers.Cookie
        delete event.request.headers['x-api-key']
        delete event.request.headers['X-Api-Key']
      }

      return event
    },

    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
  })

  console.log(
    `[Sentry] Initialized - environment: ${environment}, release: ${release}`,
  )
} else {
  console.log('[Sentry] No VITE_SENTRY_DSN configured, monitoring disabled')
}
