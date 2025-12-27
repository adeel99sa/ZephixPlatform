# Required Railway Environment Variables

This document lists all required environment variables for Railway deployment.

## Backend Service (`zephix-backend`)

### Required Variables

#### `INTEGRATION_ENCRYPTION_KEY`
- **Type:** String
- **Length:** Minimum 32 characters
- **Purpose:** Encryption key for integration secrets (API tokens, webhook secrets)
- **Algorithm:** AES-256-GCM
- **Generation:**
  ```bash
  # Option 1: Using openssl
  openssl rand -base64 32
  
  # Option 2: Using node
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- **Security:** Never commit to git. Store securely in Railway Variables.
- **Validation:** Backend validates at startup. App will fail to start if missing or too short.

### Optional Variables

#### `DATABASE_URL`
- **Type:** Connection string
- **Purpose:** PostgreSQL connection URL
- **Default:** Railway automatically provides this for Postgres services
- **Format:** `postgresql://user:password@host:port/database`

#### `JWT_SECRET`
- **Type:** String
- **Purpose:** Secret for JWT token signing
- **Default:** Must be set for authentication to work

#### `NODE_ENV`
- **Type:** String
- **Values:** `production`, `development`, `test`
- **Default:** `production` on Railway

#### `PORT`
- **Type:** Number
- **Purpose:** Port for the backend service
- **Default:** Railway automatically sets this

## Frontend Service (`zephix-frontend`)

### Required Variables

None. Frontend uses build-time environment variables via Vite.

### Optional Variables

#### `PORT`
- **Type:** Number
- **Purpose:** Port for the frontend service
- **Default:** Railway automatically sets this

#### `NODE_ENV`
- **Type:** String
- **Values:** `production`, `development`
- **Default:** `production` on Railway

## Setting Variables in Railway

1. Open Railway dashboard
2. Select the service (e.g., `zephix-backend`)
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Enter variable name and value
6. Click **Add**
7. Service will automatically redeploy

## Validation

Backend validates required variables at startup:
- Missing variables: App exits with error code 1
- Invalid variables: App exits with error code 1
- Error messages include variable name and requirements

## Security Notes

- Never commit secrets to git
- Use Railway Variables for all secrets
- Rotate keys periodically
- Use strong, randomly generated keys
- Minimum 32 characters for encryption keys

---

**Last Updated:** 2025-12-27

