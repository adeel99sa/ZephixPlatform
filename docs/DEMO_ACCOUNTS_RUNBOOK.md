# Demo Accounts – Runbook

## Symptoms
- Login fails for demo users
- E2E demo smoke failing
- CI demo smoke test failing

## Quick Commands

### Ensure users (idempotent)
```bash
cd zephix-backend && npm run ensure:demo
```

### Verify health
```bash
curl -s http://localhost:3000/api/health | jq
```

### Manual login test
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@zephix.ai","password":"demo123456"}' | jq
```

### E2E smoke (local)
```bash
cd zephix-e2e && npx playwright test tests/demo-login.spec.ts
```

### Audit demo users
```bash
bash scripts/audit-demo.sh
```

## Demo Accounts
- `admin@zephix.ai` / `admin123456` (admin)
- `member@zephix.ai` / `member123456` (pm)
- `guest@zephix.ai` / `guest123456` (viewer)
- `demo@zephix.ai` / `demo123456` (admin)

## Root Causes to Check
- DATABASE_URL rotated/missing
- DB paused (Railway)
- Recent migration altered users table or trigger
- Backend not reading env (.env not loaded)
- DEMO_BOOTSTRAP=false in environment

## Health Check Script (cron)
```bash
# */1 * * * * (cron)
h=$(curl -sf http://localhost:3000/api/health | jq -r '.checks[] | select(.name=="Database Connection") | .status')
[ "$h" = "healthy" ] || curl -X POST -H 'Content-Type: application/json' \
  -d '{"text":"Zephix DB health check FAILED"}' $SLACK_WEBHOOK_URL
```

