# Frontend Environment Variables

| Key                     | Required | Default | Purpose                                    |
|-------------------------|----------|---------|--------------------------------------------|
| VITE_API_BASE_URL       | Yes      | /api    | Backend base URL (e.g., http://localhost:8080/api) |
| VITE_ENABLE_TEMPLATES   | No       | false   | Feature flag for Templates page            |

## Notes
- Auth token sourcing: by default we read `localStorage.getItem('accessToken')`. Align with your login flow or switch to httpOnly cookies + CSRF.
- When toggling flags, restart dev server (Vite reads env on boot).

## Current Environment Files
- `.env` - Local development
- `.env.local` - Local overrides
- `.env.production` - Production settings

## API Configuration
- **Base URL**: Configured via `VITE_API_BASE_URL` environment variable
- **Authentication**: Bearer token in Authorization header via API interceptor
- **Error Handling**: Normalized error responses with status and message
- **Timeout**: Default axios timeout (can be configured)

## Feature Flags
- **Templates**: Controlled by `VITE_ENABLE_TEMPLATES` environment variable
- **Default**: `false` (templates disabled)
- **Enable**: Set `VITE_ENABLE_TEMPLATES=true` and restart dev server
