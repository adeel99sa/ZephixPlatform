# ARCHIVED
# Reason: Historical artifact

# 🎯 Zephix Green-Button Checklist

## Pre-Deploy Verification

### ✅ Code Quality
- [ ] `npm run test:guardrails` passes (no raw fetch calls)
- [ ] `npm run test:smoke:full` passes (login → hub → projects → admin → logout)
- [ ] `npm run build` succeeds without errors
- [ ] ESLint passes with no warnings
- [ ] All tests pass in CI pipeline

### ✅ Release Preparation
- [ ] Tag `v0.3-enterprise` pushed to repository
- [ ] GitHub Actions release workflow completed successfully
- [ ] Artifact `zephix-frontend-v0.3-enterprise.tgz` available in GitHub Releases
- [ ] Build metadata (git hash, build tag, timestamp) embedded in artifact

### ✅ Monitoring Setup
- [ ] Grafana dashboard imported (`docs/grafana-dashboard.json`)
- [ ] Grafana alert rules imported (`docs/grafana-alert-rules.yaml`)
- [ ] Datadog log pipeline configured (`docs/datadog-log-pipeline.json`)
- [ ] Datadog monitors imported (`docs/datadog-monitors.json`)
- [ ] Alert channels configured (Slack, PagerDuty)

---

## Deploy Process

### 1. Deploy Artifact
```bash
# Download latest artifact from GitHub Releases
wget https://github.com/yourorg/ZephixApp/releases/download/v0.3-enterprise/zephix-frontend-v0.3-enterprise.tgz

# Extract and deploy to your hosting/CDN
tar -xzf zephix-frontend-v0.3-enterprise.tgz
# Deploy dist/ contents to your hosting provider
```

### 2. Verify Deployment
```bash
# Health endpoint check
curl -s https://yourdomain.com/health | jq '.buildTag,.gitHash,.time'
# Expected: {"buildTag":"v0.3-enterprise","gitHash":"abc123...","time":"2024-..."}

# API health check
curl -s https://api.yourdomain.com/api/health | jq '.status,.db'
# Expected: {"status":"ok","db":"connected"}
```

### 3. Smoke Test
```bash
# Run full smoke test against production
npm run test:smoke:full
# Expected: All tests pass (login → hub → projects → admin → logout)
```

---

## Post-Deploy Verification

### ✅ Health Checks
- [ ] `/health` endpoint returns 200 with correct build metadata
- [ ] `/api/health` endpoint returns 200 with database status
- [ ] Frontend loads without console errors
- [ ] All static assets load correctly (CSS, JS, images)

### ✅ Authentication Flow
- [ ] Login page loads correctly
- [ ] Login with valid credentials succeeds
- [ ] Redirect to `/hub` after successful login
- [ ] Token refresh works automatically
- [ ] Logout clears session and redirects to login

### ✅ Navigation & Features
- [ ] Hub page loads with user data
- [ ] Projects page accessible and loads data
- [ ] Admin page accessible (if user has permissions)
- [ ] All lazy-loaded routes work without chunk errors
- [ ] Sidebar navigation functions correctly

### ✅ API Integration
- [ ] All API calls use `apiClient` (no raw fetch)
- [ ] Request headers include `Authorization: Bearer ...`
- [ ] Request headers include `X-Workspace-Id`
- [ ] Request headers include `X-Correlation-Id` and `X-Request-Id`
- [ ] Error handling works (4xx/5xx responses show user-friendly messages)

### ✅ Observability
- [ ] Telemetry sampling active (1% of requests logged)
- [ ] Correlation IDs present in all requests
- [ ] Build metadata visible in health endpoint
- [ ] Error logging includes correlation IDs and build context
- [ ] Performance metrics being collected

---

## Monitoring Verification

### ✅ Grafana Dashboard
- [ ] Dashboard loads with live data
- [ ] Health status shows green
- [ ] Response time graphs show normal values
- [ ] Error rate graphs show < 1% 5xx errors
- [ ] Request volume graphs show expected traffic
- [ ] Build information panel shows current version

### ✅ Datadog Monitoring
- [ ] Log pipeline parsing correlation IDs correctly
- [ ] Error rate monitors configured and active
- [ ] Performance monitors tracking response times
- [ ] Authentication monitors tracking login success
- [ ] Alert channels tested and working

### ✅ Alert Rules
- [ ] Critical alerts (S1/S2) configured for immediate response
- [ ] Warning alerts (S3) configured for investigation
- [ ] Info alerts (S4) configured for SLO tracking
- [ ] On-call rotation configured and tested
- [ ] Escalation procedures documented and tested

---

## Rollback Plan

### Quick Rollback (90 seconds)
```bash
# If critical issues detected, rollback to previous version
git tag -f v0.3-enterprise-prev <LAST_GOOD_COMMIT>
git push --force --tags
# Deploy previous artifact immediately
```

### Verification After Rollback
- [ ] `/health` shows previous build tag
- [ ] Error rate returns to baseline
- [ ] All functionality restored
- [ ] Monitoring shows healthy status

---

## Success Criteria

### Technical Metrics
- [ ] **Uptime**: > 99.9% for first 24 hours
- [ ] **Response Time**: P95 < 3.5s
- [ ] **Error Rate**: < 1% 5xx errors
- [ ] **Auth Success**: > 98% login success rate
- [ ] **Bundle Load**: No chunk load errors

### Business Metrics
- [ ] **User Experience**: No user-reported issues
- [ ] **Feature Adoption**: New features accessible
- [ ] **Performance**: Page load times < 3s
- [ ] **Reliability**: No service interruptions

---

## Emergency Contacts

### On-Call Rotation
- **Primary**: [Your contact]
- **Secondary**: [Backup contact]
- **Escalation**: [Manager contact]

### External Services
- **Hosting Provider**: [Contact info]
- **CDN Provider**: [Contact info]
- **Monitoring Service**: [Contact info]

---

## Post-Deploy Tasks (First 24 Hours)

### Hour 1
- [ ] Monitor error rates and response times
- [ ] Check user feedback channels
- [ ] Verify all monitoring alerts are working
- [ ] Test critical user journeys

### Hour 6
- [ ] Review performance metrics
- [ ] Check for any new error patterns
- [ ] Verify telemetry data collection
- [ ] Update team on deployment status

### Hour 24
- [ ] Complete post-deploy review
- [ ] Document any issues and resolutions
- [ ] Update runbooks if needed
- [ ] Plan next iteration

---

**🎉 If all items are checked, Zephix is successfully deployed and ready for production use!**
