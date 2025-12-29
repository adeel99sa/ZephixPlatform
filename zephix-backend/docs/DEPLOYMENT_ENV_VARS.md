# Deployment Environment Variables

This document lists all required and optional environment variables for Zephix backend deployment.

## Required Variables

### Authentication & Security

- **`TOKEN_HASH_SECRET`** (required)
  - Secret key for HMAC-SHA256 token hashing
  - Must be at least 32 characters long
  - Generate with: `openssl rand -hex 32`
  - Used for email verification tokens and invite tokens
  - **Never commit to git**

- **`JWT_SECRET`** (required)
  - Secret key for JWT token signing
  - Generate with: `openssl rand -hex 32`
  - **Never commit to git**

- **`JWT_REFRESH_SECRET`** (required)
  - Secret key for JWT refresh tokens
  - Generate with: `openssl rand -hex 32`
  - **Never commit to git**

### Database

- **`DATABASE_URL`** (required)
  - PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database`
  - **Never commit to git**

### Application URLs

- **`APP_BASE_URL`** (required)
  - Frontend application base URL
  - Example: `https://getzephix.com`
  - Used for email verification links

- **`API_BASE_URL`** (required)
  - Backend API base URL
  - Example: `https://api.getzephix.com` or `https://zephix-backend-production.up.railway.app`
  - Used for API calls from frontend

- **`FRONTEND_URL`** (required)
  - Frontend URL (same as APP_BASE_URL, kept for backward compatibility)
  - Example: `https://getzephix.com`

### Email Configuration

- **`SENDGRID_API_KEY`** (required for production)
  - SendGrid API key for email delivery
  - Get from: https://app.sendgrid.com/settings/api_keys
  - **Never commit to git**

- **`SENDGRID_FROM_EMAIL`** (required for production)
  - Email address to send from
  - Example: `noreply@getzephix.com`
  - Must be verified in SendGrid

- **`EMAIL_FROM_ADDRESS`** (optional, fallback)
  - Fallback email address
  - Defaults to `noreply@zephix.dev` if not set

## Optional Variables

### Application

- **`NODE_ENV`**
  - Environment: `development`, `production`, `test`
  - Default: `development`

- **`PORT`**
  - Server port
  - Default: `3000`

### Database

- **`DB_HOST`**, **`DB_PORT`**, **`DB_USERNAME`**, **`DB_PASSWORD`**, **`DB_DATABASE`**
  - Alternative to `DATABASE_URL` for database connection
  - Not used if `DATABASE_URL` is set

### Logging

- **`LOG_LEVEL`**
  - Logging level: `error`, `warn`, `info`, `debug`
  - Default: `info`

## Railway Setup

### Step 1: Generate Secrets

```bash
# Generate TOKEN_HASH_SECRET
openssl rand -hex 32

# Generate JWT_SECRET
openssl rand -hex 32

# Generate JWT_REFRESH_SECRET
openssl rand -hex 32
```

### Step 2: Set Railway Variables

In Railway dashboard for `zephix-backend` service:

1. Go to **Variables** tab
2. Add each variable:

```
TOKEN_HASH_SECRET=<generated-secret>
JWT_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-secret>
APP_BASE_URL=https://getzephix.com
API_BASE_URL=https://zephix-backend-production.up.railway.app
FRONTEND_URL=https://getzephix.com
SENDGRID_API_KEY=<your-sendgrid-key>
SENDGRID_FROM_EMAIL=noreply@getzephix.com
DATABASE_URL=<railway-provided-url>
```

### Step 3: Redeploy

After adding variables, Railway will automatically redeploy the service.

## Security Notes

- All secrets must be at least 32 characters
- Never commit secrets to git
- Rotate secrets periodically
- Use different secrets for each environment (dev, staging, prod)
- Store secrets in Railway's secure variable system

