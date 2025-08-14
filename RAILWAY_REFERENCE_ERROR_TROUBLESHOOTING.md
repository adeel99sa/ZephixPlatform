# 🚨 Railway Reference Error Troubleshooting Guide

## **ISSUE DESCRIPTION**
Both frontend and backend services are showing **"reference not found"** error in Railway deployments.

## **ROOT CAUSE ANALYSIS**

The "reference not found" error typically occurs when:
1. **Service Configuration Mismatch**: Railway service settings don't match the repository structure
2. **Build Context Issues**: Railway can't find the proper build context or root directory
3. **Configuration File Format**: Incorrect Railway configuration file format
4. **Service Registration**: Services not properly registered in Railway dashboard
5. **Repository Connection**: GitHub repository not properly connected to Railway

## **🔧 IMMEDIATE FIXES IMPLEMENTED**

### ✅ **1. Node.js Version Consistency**
- Updated frontend `.nvmrc` from 24.3.0 to 20
- Updated root `.nvmrc` to 20
- Standardized both services to Node.js 20

### ✅ **2. Railway Configuration Files**
- Created `railway.json` in both service directories
- Created `nixpacks.toml` for proper build configuration
- Added `.railwayignore` files to exclude unnecessary files

### ✅ **3. Service Configuration Updates**
- Updated Railway service settings via MCP
- Fixed build commands and start commands
- Configured proper health check paths

## **🚨 CURRENT STATUS**

Despite implementing all fixes, deployments are still failing. This suggests a deeper issue that requires manual intervention.

## **🔍 DEBUGGING STEPS**

### **Step 1: Verify Railway Service Configuration**
```bash
# Check if Railway CLI is installed
npm install -g @railway/cli

# Login to Railway
railway login

# Check project status
railway status

# List services
railway service:list
```

### **Step 2: Check Service Details**
```bash
# Check backend service details
railway service:info --service zephix-backend

# Check frontend service details
railway service:info --service zephix-frontend
```

### **Step 3: Verify Repository Connection**
```bash
# Check if repository is properly connected
railway project:info

# Verify GitHub integration
railway project:connect
```

## **🛠️ MANUAL FIXES REQUIRED**

### **Option 1: Recreate Services in Railway Dashboard**
1. **Delete existing services** from Railway dashboard
2. **Recreate services** with correct configuration:
   - **Backend**: Root directory `zephix-backend`, build command `npm ci && npm run build`
   - **Frontend**: Root directory `zephix-frontend`, build command `npm ci && npm run build`
3. **Set environment variables** through Railway dashboard
4. **Trigger new deployments**

### **Option 2: Fix Service Configuration via CLI**
```bash
# Update backend service configuration
railway service:update --service zephix-backend \
  --root-directory zephix-backend \
  --build-command "npm ci && npm run build" \
  --start-command "npm run start:railway" \
  --healthcheck-path "/api/health"

# Update frontend service configuration
railway service:update --service zephix-frontend \
  --root-directory zephix-frontend \
  --build-command "npm ci && npm run build" \
  --start-command "npm run start" \
  --healthcheck-path "/"
```

### **Option 3: Use Railway Dashboard**
1. **Go to Railway Dashboard** → Zephix Application
2. **Select each service** and update:
   - **Root Directory**: Set to correct service directory
   - **Build Command**: Verify build command
   - **Start Command**: Verify start command
   - **Health Check Path**: Set appropriate health check endpoint

## **🔧 ALTERNATIVE DEPLOYMENT STRATEGIES**

### **Strategy 1: Docker Deployment**
If Railway continues to fail, consider using Docker deployment:
```bash
# Build and push Docker images
docker build -f zephix-backend/Dockerfile.prod -t zephix-backend:latest .
docker build -f zephix-frontend/Dockerfile.prod -t zephix-frontend:latest .

# Deploy to Railway using Docker images
railway service:update --service zephix-backend --image zephix-backend:latest
railway service:update --service zephix-frontend --image zephix-frontend:latest
```

### **Strategy 2: Manual Service Recreation**
1. **Export current configuration** from Railway dashboard
2. **Delete all services** and recreate them
3. **Import configuration** and verify settings
4. **Trigger fresh deployments**

## **📊 DIAGNOSTIC COMMANDS**

### **Check Build Context**
```bash
# Verify directory structure
ls -la zephix-backend/
ls -la zephix-frontend/

# Check if Railway can access files
railway service:logs --service zephix-backend
railway service:logs --service zephix-frontend
```

### **Verify Package.json Scripts**
```bash
# Check backend scripts
cat zephix-backend/package.json | grep -A 10 '"scripts"'

# Check frontend scripts
cat zephix-frontend/package.json | grep -A 10 '"scripts"'
```

### **Test Local Builds**
```bash
# Test backend build locally
cd zephix-backend && npm ci && npm run build

# Test frontend build locally
cd zephix-frontend && npm ci && npm run build
```

## **🚨 EMERGENCY FIXES**

### **Fix 1: Reset Railway Project**
```bash
# This will reset the entire project (use with caution)
railway project:delete --confirm
# Then recreate project and services
```

### **Fix 2: Use Railway Templates**
1. **Delete current project**
2. **Create new project** using Railway templates
3. **Connect GitHub repository**
4. **Configure services** using template defaults

### **Fix 3: Manual Deployment**
```bash
# Deploy directly from service directories
cd zephix-backend && railway up
cd zephix-frontend && railway up
```

## **📋 CHECKLIST FOR RESOLUTION**

- [ ] **Node.js version consistency** ✅ (Fixed)
- [ ] **Railway configuration files** ✅ (Created)
- [ ] **Service configuration updates** ✅ (Applied)
- [ ] **Repository connection verification** ⏳ (Pending)
- [ ] **Service recreation** ⏳ (Pending)
- [ ] **Environment variable setup** ⏳ (Pending)
- [ ] **Deployment verification** ⏳ (Pending)

## **🎯 NEXT STEPS**

### **Immediate Actions**
1. **Verify Railway CLI access** and project connection
2. **Check service configuration** in Railway dashboard
3. **Verify root directory paths** are correct
4. **Test local builds** to ensure code compiles

### **If Issues Persist**
1. **Recreate services** in Railway dashboard
2. **Use Docker deployment** as fallback
3. **Contact Railway support** with error details
4. **Consider alternative platforms** (Vercel, Netlify, etc.)

## **📞 SUPPORT RESOURCES**

- **Railway Documentation**: https://docs.railway.app/
- **Railway Discord**: https://discord.gg/railway
- **GitHub Issues**: Check for similar issues in Railway repositories
- **Engineering Team**: Escalate to senior DevOps engineer

---

**Last Updated**: January 14, 2025  
**Status**: Critical - Requires Manual Intervention  
**Priority**: High - Blocking Production Deployment
