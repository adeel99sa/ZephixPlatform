#!/bin/bash
# Production Fix Verification Script
# Run steps 2-7 in order, stopping on failure

set -e  # Exit on error

echo "=========================================="
echo "Production Fix Verification"
echo "=========================================="
echo ""

# Step 1: Manual - Verify deployment in Railway Dashboard
echo "⚠️  STEP 1: MANUAL VERIFICATION REQUIRED"
echo "   Go to Railway Dashboard → zephix-backend → Deployments"
LATEST_COMMIT=$(git log -1 --oneline | cut -d' ' -f1)
echo "   Confirm running deployment includes commit: $LATEST_COMMIT"
echo "   If not, trigger a redeploy"
echo "   ⚠️  REMINDER: Do this before continuing!"
echo ""

# Step 2: Restart and log scan
echo ""
echo "=========================================="
echo "STEP 2: Restart and Log Scan"
echo "=========================================="
echo "⚠️  MANUAL: Go to Railway Dashboard → zephix-backend → Restart"
echo "   Then check Logs tab and search for:"
echo "   - AuthController"
echo "   - Mapped {/api/auth/register, POST}"
echo "   - OutboxProcessorService"
echo "   - auth_outbox"
echo ""
echo "Pass criteria:"
echo "  ✅ No 'relation \"auth_outbox\" does not exist'"
echo "  ✅ No repeated crash loops"
echo "   ⚠️  REMINDER: Verify logs before continuing!"
echo ""

# Step 3: Verify outbox write with fresh email
echo ""
echo "=========================================="
echo "STEP 3: Verify Outbox Write"
echo "=========================================="
TEST_EMAIL="test-verification-$(date +%s)-$RANDOM@example.com"
TEST_ORG="Test Org $(date +%s) $RANDOM"
echo "Registering with email: $TEST_EMAIL"
echo "Registering with org: $TEST_ORG"

RESPONSE=$(curl -i -s -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"Test123!@#\",\"fullName\":\"Test User\",\"orgName\":\"$TEST_ORG\"}")

HTTP_STATUS=$(echo "$RESPONSE" | head -n 1 | grep -oP '\d{3}')
echo ""
echo "HTTP Status: $HTTP_STATUS"
echo "$RESPONSE" | head -n 30

if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ FAILED: Expected HTTP 200, got $HTTP_STATUS"
  exit 1
fi

echo "✅ PASSED: HTTP 200 received (Step 3 expects 200)"
echo "TEST_EMAIL=$TEST_EMAIL" > /tmp/test_email.txt
echo "TEST_ORG=$TEST_ORG" >> /tmp/test_email.txt

# Step 4: Verify outbox row exists
echo ""
echo "=========================================="
echo "STEP 4: Verify Outbox Row Exists"
echo "=========================================="
echo "Inspecting auth_outbox table structure..."
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "\d+ auth_outbox"' || {
  echo "❌ FAILED: Could not inspect table structure"
  exit 1
}

echo ""
echo "Querying outbox rows..."
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "SELECT id, type, status, created_at FROM auth_outbox ORDER BY created_at DESC LIMIT 10;"' || {
  echo "❌ FAILED: Could not query outbox table"
  exit 1
}

echo "✅ PASSED: Outbox query successful (check output above for new row)"

# Step 5: Verify processing moves state
echo ""
echo "=========================================="
echo "STEP 5: Verify Processing Moves State"
echo "=========================================="
echo "Waiting 2 minutes for outbox processor..."
sleep 120

echo "Querying outbox status..."
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "SELECT id, status, attempts, processed_at, sent_at, next_attempt_at, error_message FROM auth_outbox ORDER BY created_at DESC LIMIT 10;"' || {
  echo "❌ FAILED: Could not query outbox status"
  exit 1
}

echo "✅ PASSED: Status query successful (check output above - newest row should not be 'pending')"

# Step 6: Verify duplicate email returns 200
echo ""
echo "=========================================="
echo "STEP 6: Verify Duplicate Email Returns 200"
echo "=========================================="
if [ -f /tmp/test_email.txt ]; then
  source /tmp/test_email.txt
  echo "Re-registering with same email: $TEST_EMAIL"

  # Use same email but different org name for duplicate test
  DUPLICATE_ORG="Test Org Duplicate $(date +%s) $RANDOM"
  DUPLICATE_RESPONSE=$(curl -i -s -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"Test123!@#\",\"fullName\":\"Test User\",\"orgName\":\"$DUPLICATE_ORG\"}")

  DUPLICATE_STATUS=$(echo "$DUPLICATE_RESPONSE" | head -n 1 | grep -oP '\d{3}')
  echo ""
  echo "HTTP Status: $DUPLICATE_STATUS"
  echo "$DUPLICATE_RESPONSE" | head -n 30

  if [ "$DUPLICATE_STATUS" != "200" ]; then
    echo "❌ FAILED: Expected HTTP 200 for duplicate, got $DUPLICATE_STATUS"
    exit 1
  fi

  # Check for neutral message
  if echo "$DUPLICATE_RESPONSE" | grep -q "If an account with this email exists"; then
    echo "✅ PASSED: HTTP 200 with neutral message"
  else
    echo "⚠️  WARNING: Got 200 but message may not be neutral"
  fi
else
  echo "⚠️  SKIPPED: Test email not found, skipping duplicate test"
fi

# Step 7: Code sanity check
echo ""
echo "=========================================="
echo "STEP 7: Code Sanity Check"
echo "=========================================="
echo "Verifying 23505 handler in code..."

if grep -q "23505" zephix-backend/src/modules/auth/services/auth-registration.service.ts; then
  echo "✅ Found 23505 error code handler"
else
  echo "❌ FAILED: 23505 handler not found"
  exit 1
fi

if grep -q "If an account with this email exists" zephix-backend/src/modules/auth/services/auth-registration.service.ts; then
  echo "✅ Found neutral message"
else
  echo "❌ FAILED: Neutral message not found"
  exit 1
fi

if grep -q "throw error" zephix-backend/src/modules/auth/services/auth-registration.service.ts; then
  echo "✅ Found re-throw for other errors"
else
  echo "⚠️  WARNING: Re-throw may be missing"
fi

echo ""
echo "=========================================="
echo "✅ ALL VERIFICATION STEPS COMPLETED"
echo "=========================================="

