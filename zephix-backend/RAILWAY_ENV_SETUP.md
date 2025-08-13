# Railway Production Environment Variables Setup

## 🚀 **Backend Environment Variables (zephix-backend)**

Navigate to Railway Dashboard > zephix-backend > Variables tab and add these:

### **Database Configuration (Railway PostgreSQL)**
```bash
DATABASE_URL=postgresql://${{PGUSER}}:${{PGPASSWORD}}@${{PGHOST}}:${{PGPORT}}/${{PGDATABASE}}
DB_HOST=${{PGHOST}}
DB_PORT=${{PGPORT}}
DB_USERNAME=${{PGUSER}}
DB_PASSWORD=${{PGPASSWORD}}
DB_DATABASE=${{PGDATABASE}}
```

### **JWT Configuration (CRITICAL - Change these!)**
```bash
JWT_SECRET=zephix-production-jwt-secret-2025-change-this-immediately
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### **Application Configuration**
```bash
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://zephix-frontend.up.railway.app
```

### **Security Configuration**
```bash
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=10
BCRYPT_ROUNDS=10
```

### **Monitoring (Optional but Recommended)**
```bash
SENTRY_DSN=your-sentry-dsn-here
LOG_LEVEL=info
```

---

## 🌐 **Frontend Environment Variables (zephix-frontend)**

Navigate to Railway Dashboard > zephix-frontend > Variables tab and add these:

### **API Configuration**
```bash
VITE_API_URL=https://zephix-backend.up.railway.app/api
VITE_APP_NAME=Zephix
VITE_APP_VERSION=1.0.0
```

### **Feature Flags**
```bash
VITE_ENABLE_AUTH=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_SENTRY=false
```

### **Public URLs**
```bash
VITE_PUBLIC_URL=https://zephix-frontend.up.railway.app
```

---

## 📋 **Setup Instructions**

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Select your Zephix project**
3. **For each service**:
   - Click on the service (zephix-backend or zephix-frontend)
   - Go to the "Variables" tab
   - Add each environment variable
   - Click "Add Variable" after each one
4. **Save and redeploy** both services

## 🔒 **Security Notes**

- **JWT_SECRET**: Must be a strong, unique secret (at least 32 characters)
- **Database credentials**: Railway automatically provides these
- **CORS_ORIGIN**: Must match your frontend URL exactly
- **Never commit secrets** to Git - use Railway variables only

## ✅ **Verification Checklist**

After setting environment variables:

- [ ] Backend builds successfully
- [ ] Database migrations run
- [ ] Health check endpoint responds
- [ ] Frontend builds and deploys
- [ ] API calls work from frontend
- [ ] Authentication flow works
- [ ] Protected routes accessible
