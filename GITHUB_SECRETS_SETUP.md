# GitHub Secrets Setup for Container Registry

## Required Secrets

### 1. CR_PAT (GitHub Container Registry Personal Access Token)
- **Purpose**: Authenticate with GitHub Container Registry (GHCR)
- **Scope**: `write:packages` permission
- **How to create**:
  1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. Generate new token
  3. Select `write:packages` scope
  4. Copy the token value

### 2. RAILWAY_TOKEN (Optional - for CI/CD deploys)
- **Purpose**: Allow GitHub Actions to trigger Railway deployments
- **Scope**: Railway API access
- **How to create**:
  1. Go to Railway Dashboard → Account → Tokens
  2. Create new token
  3. Copy the token value

### 3. Environment Variables (Optional - if needed for builds)
- **FRONTEND_ENV**: JSON or .env content for frontend builds
- **BACKEND_ENV**: JSON or .env content for backend builds

## Container Registry URLs

After setup, your images will be available at:
- **Frontend**: `ghcr.io/adeel99sa/zephix-frontend:latest`
- **Backend**: `ghcr.io/adeel99sa/zephix-backend:latest`

## Railway Configuration

### Frontend Service
- **Image**: `ghcr.io/adeel99sa/zephix-frontend:latest`
- **Internal Port**: `8080`
- **Health Check**: `/`
- **Clear**: Start Command, Build Command
- **Set**: `RAILWAY_EXPOSE_PORT=8080`

### Backend Service
- **Image**: `ghcr.io/adeel99sa/zephix-backend:latest`
- **Internal Port**: `3000`
- **Health Check**: `/health`
- **Clear**: Start Command, Build Command

## Rollback Strategy

- **Normal Flow**: Use `:latest` tag
- **Incident Response**: Pin to specific SHA tag (e.g., `:sha-abc123`)
- **Rollback**: Change image tag in Railway service settings
