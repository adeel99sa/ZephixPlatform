# Sentry Observability Setup

## Sentry Account

Org: zephix-llc

Backend project: node-nestjs

Frontend project: zephix-frontend

## Required Environment Variables

### Backend (Railway staging service)

| Variable | Value | Required |
|---|---|---|
| SENTRY_DSN | https://eb75e87dfdd4fa5b3a1ba1b1d278a2d6@o4511282291736576.ingest.us.sentry.io/4511282304057344 | Yes |
| ZEPHIX_ENV | staging | Yes (already set) |
| SENTRY_RELEASE | $RAILWAY_GIT_COMMIT_SHA (auto) | Auto |

### Frontend (Railway staging service - build-time variables)

| Variable | Value | Required |
|---|---|---|
| VITE_SENTRY_DSN | https://4da01a8ad796d2ae3b51e9e161bea9b3@o4511282291736576.ingest.us.sentry.io/4511282330664960 | Yes |
| VITE_SENTRY_RELEASE | $RAILWAY_GIT_COMMIT_SHA | Yes |
| VITE_ZEPHIX_ENV | staging | Yes |
| SENTRY_AUTH_TOKEN | From password manager (`sntryu_` prefix) | Yes |
| SENTRY_ORG_SLUG | zephix-llc | Yes |

Note: `SENTRY_AUTH_TOKEN` is build-time only and is used by the Vite plugin to upload source maps. It is not needed at runtime. Store it in the password manager, not in the repo.

## Sensitive Data Scrubbing

Request bodies are redacted for these paths before sending to Sentry:

- `/api/v1/ai/assist`
- `/api/v1/field-notes`
- `/api/auth/*`

Auth headers (`Authorization`, `Cookie`, `x-api-key`) are stripped from all events.

## Session Replay

- Frontend records session video for debugging.
- All text is masked and all media is blocked.
- 10% of normal sessions are sampled.
- 100% of sessions with errors are captured.

## Verifying Setup

After deploy:

1. Check Railway deploy logs for `[Sentry] Initialized - environment: staging, release: <commit-sha>`.
2. Trigger backend test error: `GET https://zephix-backend-staging-staging.up.railway.app/api/health/sentry-test`. It should return `500` in staging. The endpoint returns `404` outside staging.
3. Verify the error appears in the Sentry backend project within 30 seconds: `https://zephix-llc.sentry.io/issues/?project=node-nestjs`.
4. Trigger a frontend test error from the staging site browser console:

   ```javascript
   window.testSentry = () => {
     throw new Error('Frontend Sentry test')
   }
   testSentry()
   ```

5. Verify the error appears in the Sentry frontend project within 30 seconds: `https://zephix-llc.sentry.io/issues/?project=zephix-frontend`.
6. Verify source maps work: frontend errors should show readable file and line numbers, not minified code.

## Troubleshooting

If errors do not appear:

- Check Railway env var `SENTRY_DSN` for backend or `VITE_SENTRY_DSN` for frontend.
- Check Railway deploy logs for the `[Sentry] Initialized` message.
- Check Sentry project settings -> Client Keys (DSN) matches the Railway env var.
- For frontend, check the browser network tab for requests to `ingest.us.sentry.io`.

## Email Alerts

The default rule "Alert me on high priority issues" sends emails to project members. Verify recipients in Sentry: project -> Settings -> Alerts.

## Removing Test Endpoint

After verification, optionally remove `/api/health/sentry-test` to avoid noise.
