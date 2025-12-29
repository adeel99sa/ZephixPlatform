# Startup Logs Checklist - After Deployment

## What to Look For

After Railway deploys commit `b5740e8` or later, check the **first 30 lines** of backend startup logs.

## Expected Route Mappings

You should see these lines in the logs:

```
[Nest] LOG [RouterExplorer] Mapped {/api/auth/register, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/auth/signup, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/auth/login, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/auth/resend-verification, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/auth/verify-email, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/templates, GET} route
[Nest] LOG [RouterExplorer] Mapped {/api/templates, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/integrations, GET} route
[Nest] LOG [RouterExplorer] Mapped {/api/integrations, POST} route
```

## What NOT to See

❌ **DO NOT see any of these:**
```
Mapped {/api/api/auth/register, POST} route
Mapped {/api/api/templates, GET} route
Mapped {/api/api/integrations, GET} route
```

## How to Get Logs

### Option 1: Railway Dashboard
1. Go to Railway → Your Backend Service
2. Click "Deployments" tab
3. Click latest deployment
4. Click "View Logs"
5. Scroll to top (startup logs)
6. Copy first 30 lines

### Option 2: Railway CLI
```bash
railway logs --service backend | head -30
```

## Sample Log Output (First 30 Lines)

```
🚀 Creating NestJS application...
🔧 Setting global prefix...
🛡️ Configuring security middleware...
🍪 Configuring cookie parser...
🌐 Configuring CORS...
🆔 Configuring request ID middleware...
✅ Configuring global validation pipe...
📦 Configuring global envelope interceptor...
🚨 Configuring global exception filter...
[Nest] LOG [RoutesResolver] AuthController {/api/auth}:
[Nest] LOG [RouterExplorer] Mapped {/api/auth/signup, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/auth/register, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/auth/login, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/auth/resend-verification, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/auth/verify-email, POST} route
[Nest] LOG [RoutesResolver] TemplatesController {/api/templates}:
[Nest] LOG [RouterExplorer] Mapped {/api/templates, GET} route
[Nest] LOG [RouterExplorer] Mapped {/api/templates, POST} route
[Nest] LOG [RoutesResolver] IntegrationsController {/api/integrations}:
[Nest] LOG [RouterExplorer] Mapped {/api/integrations, GET} route
[Nest] LOG [RouterExplorer] Mapped {/api/integrations, POST} route
✅ Application is running on: http://localhost:8080
✅ API endpoints available at: http://localhost:8080/api
```

## Verification Checklist

- [ ] Deployment shows commit `b5740e8` or later
- [ ] Logs show `Mapped {/api/auth/register, POST} route`
- [ ] Logs show `Mapped {/api/templates, GET} route` (not `/api/api/templates`)
- [ ] Logs show `Mapped {/api/integrations, GET} route` (not `/api/api/integrations`)
- [ ] No routes contain `/api/api` prefix
- [ ] Health check returns 200
- [ ] Register endpoint returns 200 (not 404)

---

**After deployment, paste the first 30 lines of logs here for verification.**

