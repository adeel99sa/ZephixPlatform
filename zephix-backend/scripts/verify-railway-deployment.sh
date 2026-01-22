#!/bin/bash
# Verification script for Railway deployment
# Run this locally to check what you should see in Railway

set -e

echo "=== Railway Deployment Verification Helper ==="
echo ""
echo "This script helps you verify what to check in Railway."
echo "You still need to manually check Railway dashboard and run one-time commands."
echo ""

# Get current branch and commit
CURRENT_BRANCH=$(git branch --show-current)
CURRENT_COMMIT=$(git rev-parse HEAD)
SHORT_COMMIT=$(git rev-parse --short HEAD)

echo "📋 Expected Values:"
echo "  Branch: $CURRENT_BRANCH"
echo "  Commit SHA: $CURRENT_COMMIT"
echo "  Short SHA: $SHORT_COMMIT"
echo ""

echo "✅ Step 1: Confirm Railway Deployment"
echo "  Railway → Backend Service → Deployments → Latest"
echo "  Verify:"
echo "    - Branch: $CURRENT_BRANCH"
echo "    - Commit SHA: $SHORT_COMMIT (or full: $CURRENT_COMMIT)"
echo "    - Root Directory: zephix-backend"
echo "    - Start Command: npm run start:railway"
echo ""

echo "✅ Step 2: Prove Migrations Ran"
echo "  Railway → One-time command: npm run migration:show"
echo "  Expected: See 'AddAuthOutboxCompositeIndexes1796000000001' in executed list"
echo ""

echo "✅ Step 3: Prove Indexes Exist"
echo "  Railway → One-time command:"
echo "  node -e \"const { Client } = require('pg'); (async()=>{ const c=new Client({connectionString:process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}}); await c.connect(); const r=await c.query(\`select indexname from pg_indexes where tablename='auth_outbox' order by indexname\`); console.log(r.rows); await c.end(); })()\""
echo "  Expected: See 'idx_auth_outbox_pending_claim' and 'idx_auth_outbox_failed_retry'"
echo ""

echo "✅ Step 4: Prove Healthcheck Behavior"
echo "  From your laptop:"
echo "    curl -i https://YOUR_BACKEND_DOMAIN/api/health"
echo "    Expected: HTTP 200, <1 second"
echo ""
echo "    curl -i https://YOUR_BACKEND_DOMAIN/api/health/detailed"
echo "    Expected: HTTP 200, slower is fine"
echo ""

echo "✅ Step 5: Prove Logging Stays Quiet (5 minutes)"
echo "  Railway → Backend Service → Logs"
echo "  Watch for 5 minutes. Should NOT see:"
echo "    - query: spam"
echo "    - request_start or request_end JSON logs"
echo "    - outbox polling logs"
echo ""

echo "✅ Step 6: Merge and Cut Over Safely"
echo "  After all checks pass:"
echo "    1. git checkout main"
echo "    2. git merge $CURRENT_BRANCH"
echo "    3. git push origin main"
echo "    4. Railway → Switch branch to 'main'"
echo "    5. Railway → Redeploy"
echo "    6. Repeat steps 2-5"
echo ""

echo "🔒 Railway Environment Variables (keep as-is):"
echo "  OUTBOX_PROCESSOR_ENABLED=false"
echo "  REQUEST_CONTEXT_LOGGER_ENABLED=false"
echo "  TYPEORM_LOGGING=false"
echo ""

echo "📚 Full checklist: docs/RAILWAY_VERIFICATION_CHECKLIST.md"
echo ""
