# 🚀 Zephix Operations Runbook

## One-Command Release

```bash
# from a clean main
git pull --rebase
npm ci && npm run build              # local confidence
git tag v0.3-enterprise && git push --tags
# → GH Actions builds + publishes zephix-frontend-v0.3-enterprise.tgz
```

## ✅ Go-Live Verification (copy/paste)

### Health + Build Metadata
```bash
curl -sI https://<your-host>/health | head -5
curl -s https://<your-host>/health | jq
# expect: { buildTag:"v0.3-enterprise", gitHash:"...", env:"production", time:"..." }
```

### Auth & Routes (Happy Path)
```bash
# Frontend proxy path normalization
curl -si https://<your-host>/api/health

# Login flow (backend)
curl -si -X POST https://<api-host>/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"demo@zephix.com","password":"Demo123!@#"}'
# expect 201; set-cookie/authorization present
```

### Headers/Observability
Open browser → DevTools → Network → any XHR:
- `Authorization: Bearer …` ✔
- `X-Workspace-Id: <id>` ✔
- `X-Correlation-Id / X-Request-Id` ✔

### Guardrails (Local/CI)
```bash
npm run test:guardrails   # no raw fetch()
npm run test:smoke:full   # login → hub → projects → admin → logout
npm run build             # type + bundle check
```

---

## 🔧 Daily Operations

### Releases
- **Tag releases**: `git tag vX.Y-*` → artifact auto-publishes
- **Release notes**: Auto-generated with build metadata
- **Artifacts**: `zephix-frontend-vX.Y-*.tgz` available in GitHub Releases

### Rollbacks
```bash
# Quick rollback to last good release
git tag -f v0.3-enterprise && git push --force --tags
# → New artifact published, deploy immediately
```

### Health Monitoring
- **Frontend**: Probe `/health` endpoint
- **Backend**: Probe `/api/health` endpoint
- **Expected response**: 200 with build metadata
- **Alert on**: Non-200 status or missing build info

### Request Tracing
- **Correlation ID**: Search logs by `x-correlation-id`
- **Request ID**: Unique per request for debugging
- **Full trace**: Client → API Gateway → Backend → Database

### Error Triage
1. **User reports error** → Check browser console
2. **Find correlation ID** in Network tab
3. **Search backend logs** for same correlation ID
4. **Trace full request flow** from client to database

---

## 🛡️ What's Locked In

### API Discipline
- **Single source**: All HTTP through `apiClient`
- **ESLint rule**: Blocks `fetch()` in IDE
- **Guardrail test**: Fails CI on raw `fetch` calls
- **Pre-commit hook**: Prevents bad commits

### Auth Stability
- **Token attachment**: Automatic on all requests
- **Single-flight refresh**: Prevents stampede
- **Loop protection**: Excludes `/auth/*` routes
- **Graceful degradation**: Logout on refresh failure

### Observability
- **1% HTTP sampling**: Performance metrics
- **Correlation IDs**: Request tracing
- **Request IDs**: Unique per request
- **Centralized logging**: Error context with build info

### Documentation
- **Engineering Playbook**: Development standards
- **API Client Guide**: Usage patterns
- **Go-Live Checklist**: Deployment verification
- **Troubleshooting Guide**: Common issues

---

## 📊 Monitoring Setup

### Health Checks
```bash
# Frontend health
curl -f https://yourdomain.com/health || alert

# Backend health  
curl -f https://api.yourdomain.com/health || alert
```

### Key Metrics to Monitor
- **Response times**: P50, P95, P99
- **Error rates**: 4xx, 5xx percentages
- **Auth success rate**: Login/refresh success
- **Bundle load times**: Chunk loading performance

### Alerting Thresholds
- **Health endpoint down**: Immediate alert
- **Error rate > 5%**: Warning
- **Error rate > 10%**: Critical
- **Response time > 2s**: Warning
- **Response time > 5s**: Critical

---

## 🚨 Incident Response

### Common Issues

#### 401 Authentication Loops
**Symptoms**: Infinite refresh cycles
**Solution**: Check refresh endpoint, verify token validity
**Prevention**: Monitor auth success rates

#### CORS Errors
**Symptoms**: `Access to fetch blocked by CORS`
**Solution**: Update backend CORS configuration
**Prevention**: Test CORS in staging environment

#### Chunk Load Errors
**Symptoms**: `Loading chunk failed`
**Solution**: Purge CDN cache, verify chunk names
**Prevention**: Monitor bundle integrity

#### Double API Prefix
**Symptoms**: 404s on `/api/api/...` URLs
**Solution**: Check for hardcoded `/api` prefixes
**Prevention**: Guardrail test catches this

### Escalation Path
1. **Level 1**: Check health endpoints, basic connectivity
2. **Level 2**: Review logs, check correlation IDs
3. **Level 3**: Full request tracing, backend investigation
4. **Level 4**: Rollback to last known good version

---

## 🔄 Maintenance Tasks

### Weekly
- Review error rates and response times
- Check for new security vulnerabilities
- Verify backup procedures

### Monthly
- Update dependencies
- Review and rotate secrets
- Test rollback procedures

### Quarterly
- Security audit
- Performance optimization review
- Documentation updates

---

## 📞 Emergency Contacts

### On-Call Rotation
- **Primary**: [Your contact]
- **Secondary**: [Backup contact]
- **Escalation**: [Manager contact]

### External Services
- **Hosting Provider**: [Contact info]
- **CDN Provider**: [Contact info]
- **Monitoring Service**: [Contact info]

---

## 🎯 Success Metrics

### Technical
- **Uptime**: > 99.9%
- **Response time**: < 2s P95
- **Error rate**: < 1%
- **Deployment success**: > 95%

### Business
- **User satisfaction**: > 4.5/5
- **Feature adoption**: Track new feature usage
- **Performance**: Page load times < 3s

---

**This runbook ensures Zephix operates reliably in production with clear procedures for releases, monitoring, and incident response.**
