# 🚀 Zephix Go-Live Checklist

## ✅ **Pre-Deploy Verification (5 minutes)**

### **1. Build from Stable Tag**
```bash
git checkout v0.2-stable
cd zephix-frontend
npm ci && npm run build
```
**Expected**: Clean build with no errors

### **2. Smoke Test (Local)**
```bash
npm run test:smoke:full
```
**Expected**: All tests pass (login → hub → projects → admin → logout)

### **3. Guardrail Verification**
```bash
npm run test:guardrails
```
**Expected**: No raw `fetch` calls found

### **4. Environment Check**
- [ ] `VITE_API_BASE` set correctly (empty for dev, gateway URL for prod)
- [ ] Backend CORS allows your origin + credentials
- [ ] Backend is running and healthy

---

## 🌐 **Deploy Steps**

### **1. Deploy Frontend**
```bash
# Copy dist/ folder to your hosting/CDN
# Point environment to backend URL
# Clear CDN cache if applicable
```

### **2. Deploy Backend**
```bash
# Deploy backend with CORS configured
# Ensure health endpoint responds
# Verify auth endpoints work
```

---

## 🔍 **Post-Deploy Verification (5 minutes)**

### **1. Network Tab Check**
Open DevTools → Network tab, verify:
- [ ] No `/api/api/...` URLs (should be `/api/...`)
- [ ] All requests have `x-request-id` and `x-correlation-id` headers
- [ ] Authenticated requests have `Authorization: Bearer ...` header
- [ ] Requests have `X-Workspace-Id` header

### **2. Authentication Flow**
- [ ] Login works with valid credentials
- [ ] Login fails gracefully with invalid credentials
- [ ] Successful login redirects to `/hub`
- [ ] Logout works and redirects to `/login`

### **3. Error Handling**
- [ ] Force a 500 error (if possible) → global toast appears
- [ ] Check console for error logs with correlation IDs
- [ ] 401 errors trigger token refresh (not on auth routes)

### **4. Lazy Loading**
- [ ] Admin pages load without "lazy resolves to undefined" errors
- [ ] Each admin page loads as separate chunk
- [ ] Navigation between pages is smooth

---

## 🚨 **Rollback Procedures**

### **Frontend Rollback**
```bash
git checkout v0.1-stable
cd zephix-frontend
npm ci && npm run build
# Deploy new build
```

### **Backend Rollback**
```bash
# Redeploy previous backend image
# Frontend will handle gracefully (401s → logout)
```

---

## 📊 **Monitoring Setup**

### **Key Metrics to Watch**
- [ ] Login success rate
- [ ] Page load times
- [ ] Error rates (4xx, 5xx)
- [ ] Token refresh success rate

### **Alerting**
- [ ] Set up alerts for 500 errors
- [ ] Monitor correlation ID logs
- [ ] Track user session duration

---

## 🎯 **Success Criteria**

### **Technical**
- [ ] All smoke tests pass
- [ ] No raw `fetch` calls in production
- [ ] All API calls properly normalized
- [ ] Error handling works correctly
- [ ] Observability headers present

### **User Experience**
- [ ] Login flow works smoothly
- [ ] Navigation is responsive
- [ ] Error messages are clear
- [ ] No console errors

### **Developer Experience**
- [ ] CI pipeline passes
- [ ] Guardrails prevent regressions
- [ ] Documentation is complete
- [ ] Rollback procedures tested

---

## 🔧 **Day-2 Operations**

### **Token Management**
- [ ] Rotate refresh tokens → clients auto-logout on next 401
- [ ] Monitor token refresh success rates
- [ ] Handle token expiration gracefully

### **User Issue Debugging**
- [ ] Get `x-correlation-id` from browser DevTools
- [ ] Search backend logs for correlation ID
- [ ] Trace full request flow

### **Feature Quarantine**
- [ ] Use feature flags to disable problematic routes
- [ ] Guardrails protect the rest of the app
- [ ] Smoke tests verify core functionality

---

## 📞 **Emergency Contacts**

### **If Something Breaks**
1. **Check CI status** - Is the pipeline green?
2. **Verify environment** - Are all services running?
3. **Check logs** - Look for correlation IDs
4. **Rollback if needed** - Use procedures above

### **Common Issues**
- **401 loops**: Check if refresh endpoint changed
- **503 errors**: Backend down, frontend shows toast
- **CORS errors**: Check backend CORS configuration
- **Build failures**: Check Node version compatibility

---

## 🎉 **Go-Live Complete!**

Once all items are checked:
- [ ] **Production is live and stable**
- [ ] **All systems operational**
- [ ] **Monitoring active**
- [ ] **Team notified of success**

**Congratulations! 🚀 Zephix is now running in production with enterprise-grade reliability and self-protection.**
