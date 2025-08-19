# Zephix Deployment Checklist

## STAGING DEPLOYMENT

### Backend Staging
- [ ] **Build Command**: `npm run build`
- [ ] **Start Command**: `npm run start:prod`
- [ ] **Environment Variables on Railway**:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=3000`
  - [ ] `CORS_ALLOWED_ORIGINS=https://zephix-frontend-staging.up.railway.app`
  - [ ] `DATABASE_URL` (your database URL)
  - [ ] `JWT_SECRET` (your JWT secret)
  - [ ] `JWT_EXPIRES_IN` (your JWT expiry)

### Frontend Staging
- [ ] **Build Command**: `npm run build`
- [ ] **Publish Directory**: `dist`
- [ ] **Environment Variables**:
  - [ ] `VITE_API_URL=https://zephix-backend-staging.up.railway.app/api`
  - [ ] `VITE_STRICT_JWT=false`

## PRODUCTION DEPLOYMENT

### Backend Production
- [ ] **Build Command**: `npm run build`
- [ ] **Start Command**: `npm run start:prod`
- [ ] **Environment Variables on Railway**:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=3000`
  - [ ] `CORS_ALLOWED_ORIGINS=https://zephix-frontend-production.up.railway.app,https://getzephix.com,https://www.getzephix.com,https://app.getzephix.com`
  - [ ] `DATABASE_URL` (your database URL)
  - [ ] `JWT_SECRET` (your JWT secret)
  - [ ] `JWT_EXPIRES_IN` (your JWT expiry)

### Frontend Production
- [ ] **Build Command**: `npm run build`
- [ ] **Publish Directory**: `dist`
- [ ] **Environment Variables**:
  - [ ] `VITE_API_URL=https://zephix-backend-production.up.railway.app/api`
  - [ ] `VITE_STRICT_JWT=false`

## SMOKE TESTS

### Staging Smoke Tests
```bash
# Health Check
curl -i https://zephix-backend-staging.up.railway.app/api/health

# Login Test
curl -s -X POST https://zephix-backend-staging.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@zephix.com","password":"YOURPASS"}' | jq .

# Frontend Test
open https://zephix-frontend-staging.up.railway.app
# Login and check Network tab confirms requests to staging backend
```

### Production Smoke Tests
```bash
# Health Check
curl -i https://zephix-backend-production.up.railway.app/api/health

# Login Test
curl -s -X POST https://zephix-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@zephix.com","password":"YOURPASS"}' | jq .

# Frontend Test
open https://getzephix.com
# Login and check Network tab confirms requests to production backend
```

## DEPLOYMENT COMMANDS

### Staging
```bash
# Backend
cd zephix-backend
./scripts/deploy-staging.sh

# Frontend
cd zephix-frontend
./scripts/deploy-staging.sh
```

### Production
```bash
# Backend
cd zephix-backend
./scripts/deploy-production.sh

# Frontend
cd zephix-frontend
./scripts/deploy-production.sh
```

## ROLLBACK PROCEDURES

### If Staging Fails
```bash
# Backend
railway rollback --service zephix-backend-staging

# Frontend
railway rollback --service zephix-frontend-staging
```

### If Production Fails
```bash
# Backend
railway rollback --service zephix-backend-production

# Frontend
railway rollback --service zephix-frontend-production
```

## POST-MVP HARDENING

- [ ] Move tokens to httpOnly refresh cookies
- [ ] Add per route rate limits for auth
- [ ] Add CSP via Helmet with script-src to your domains only
- [ ] Turn VITE_STRICT_JWT true
- [ ] Add Sentry on both sides
