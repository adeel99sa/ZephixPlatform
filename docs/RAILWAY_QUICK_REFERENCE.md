# Railway Deployment Quick Reference

## 🚀 Quick Commands

### Deployment
```bash
# Deploy all services
./scripts/deploy-railway.sh

# Deploy specific service
railway up --service backend
railway up --service frontend

# Deploy with specific environment
railway up --environment production
```

### Monitoring
```bash
# Check service status
railway status

# View logs
railway logs
railway logs --service backend
railway logs --service frontend

# Follow logs in real-time
railway logs --follow
```

### Service Management
```bash
# Open service in browser
railway open

# Scale service
railway scale --service backend --count 2

# Restart service
railway restart --service backend
```

## 🔧 Configuration Files

### Root Level
- `railway.toml` - Monorepo coordination
- `.railwayignore` - Global ignore patterns

### Service Level
- `zephix-backend/railway.toml` - Backend configuration
- `zephix-frontend/railway.toml` - Frontend configuration
- `zephix-backend/.railwayignore` - Backend isolation
- `zephix-frontend/.railwayignore` - Frontend isolation

## 🏥 Health Check Endpoints

### Backend
- **URL**: `/api/health`
- **Timeout**: 300 seconds
- **Retries**: 3
- **Interval**: 30 seconds

### Frontend
- **URL**: `/`
- **Timeout**: 300 seconds
- **Retries**: 3
- **Interval**: 30 seconds

## 🚨 Troubleshooting

### Common Issues

#### Builder Detection Conflicts
```bash
# Verify no Dockerfiles exist
find . -name "Dockerfile*" -type f

# Check .railwayignore files
cat .railwayignore
cat zephix-backend/.railwayignore
cat zephix-frontend/.railwayignore
```

#### Service Health Issues
```bash
# Check service logs
railway logs --service backend --tail 50

# Verify environment variables
railway variables

# Check service status
railway status --service backend
```

#### Deployment Failures
```bash
# Verify Railway configuration
./scripts/verify-railway-deployment.sh

# Check build logs
railway logs --service backend --build

# Redeploy with verbose logging
railway up --service backend --verbose
```

### Debug Commands
```bash
# Check Railway CLI version
railway --version

# Verify login status
railway whoami

# List all projects
railway projects

# Check project details
railway project
```

## 📋 Environment Variables

### Required Backend Variables
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=...
OPENAI_API_KEY=...
```

### Required Frontend Variables
```bash
NODE_ENV=production
PORT=3000
VITE_API_URL=https://...
VITE_SENTRY_DSN=...
```

## 🔄 Restart Policies

### Backend Service
- **Type**: `on_failure`
- **Max Retries**: 3
- **Health Check**: `/api/health`

### Frontend Service
- **Type**: `on_failure`
- **Max Retries**: 3
- **Health Check**: `/`

## 📊 Monitoring

### Health Check Metrics
- **Response Time**: < 300 seconds
- **Availability**: 99.9% target
- **Auto-restart**: On health check failure

### Logging
- **Format**: JSON structured
- **Level**: Production (info, warn, error)
- **Retention**: Railway managed

## 🚀 Next Steps

### Phase 2 (Next Session)
- [ ] Observability implementation
- [ ] Security hardening
- [ ] Performance monitoring

### Core Business Logic
- [ ] BRD-to-Plan engine
- [ ] AI chat service enhancement
- [ ] User experience improvements

---

**Remember**: Always run `./scripts/verify-railway-deployment.sh` before deploying to ensure configuration is correct.
