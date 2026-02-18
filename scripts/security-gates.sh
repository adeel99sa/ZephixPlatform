#!/usr/bin/env bash
set -euo pipefail

BACKEND_SRC="zephix-backend/src"
FAILURES=0

fail() {
  echo "❌ FAIL: $1"
  FAILURES=$((FAILURES + 1))
}

pass() {
  echo "✅ PASS: $1"
}

echo "=== Zephix Security Regression Gates ==="
echo ""

# 1. No PII or token data in logs (email, password, token, html in log statements)
PII_IN_LOGS=$(grep -rn 'console\.\(log\|error\|warn\)' "$BACKEND_SRC" \
  --include='*.ts' \
  --exclude='*.spec.ts' \
  --exclude='*.test.ts' \
  --exclude='*.bak' \
  --exclude='dev-seed.ts' \
  --exclude='seed-*.ts' \
  --exclude='smoke-test-*.ts' \
  --exclude-dir='scripts' \
  | grep -i 'user\.email\|options\.to\|first100Chars\|options\.html\|\.password\|token.*=\|apiKey\|response\.body' \
  | grep -v '//' \
  || true)

if [ -n "$PII_IN_LOGS" ]; then
  COUNT=$(echo "$PII_IN_LOGS" | wc -l | tr -d ' ')
  fail "Found $COUNT log statements leaking PII/tokens/HTML"
  echo "$PII_IN_LOGS"
  echo ""
else
  pass "No PII/token/HTML leakage in log statements"
fi

# 2. No test-only endpoints deployed (csrf-test, debug, test-endpoint)
TEST_ENDPOINTS=$(grep -rn "csrf-test\|debug-endpoint\|test-endpoint\|@Post('test')\|@Get('test')" "$BACKEND_SRC" \
  --include='*.controller.ts' \
  --exclude='*.spec.ts' \
  --exclude='*.test.ts' \
  || true)

if [ -n "$TEST_ENDPOINTS" ]; then
  fail "Test-only endpoints found in controllers"
  echo "$TEST_ENDPOINTS"
  echo ""
else
  pass "No test-only endpoints in controllers"
fi

# 3. No @Throttle decorators (ThrottlerGuard is disabled; use RateLimiterGuard)
THROTTLE_HITS=$(grep -rn '@Throttle' "$BACKEND_SRC" \
  --include='*.ts' \
  --exclude='*.spec.ts' \
  --exclude='*.test.ts' \
  --exclude='*.bak' \
  || true)

if [ -n "$THROTTLE_HITS" ]; then
  fail "@Throttle decorators found (ThrottlerGuard is disabled; use @UseGuards(RateLimiterGuard) + @SetMetadata)"
  echo "$THROTTLE_HITS"
  echo ""
else
  pass "No dead @Throttle decorators"
fi

# 4. No hardcoded JWT fallback secrets (actual code, not comments)
FALLBACK_SECRETS=$(grep -rn "fallback-.*secret\|fallback.*key" "$BACKEND_SRC" \
  --include='*.ts' \
  --exclude='*.spec.ts' \
  --exclude='*.test.ts' \
  --exclude='dev-seed.ts' \
  --exclude='*.bak' \
  | grep -v '^\s*//' \
  | grep -v '// ' \
  || true)

if [ -n "$FALLBACK_SECRETS" ]; then
  fail "Hardcoded fallback secrets found"
  echo "$FALLBACK_SECRETS"
  echo ""
else
  pass "No hardcoded fallback secrets"
fi

# 5. No email HTML content in logs
EMAIL_HTML_LOGS=$(grep -rn 'console.*first100Chars\|console.*options\.html\|console.*options\.to\b' "$BACKEND_SRC" \
  --include='*.ts' \
  --exclude='*.spec.ts' \
  --exclude='*.test.ts' \
  || true)

if [ -n "$EMAIL_HTML_LOGS" ]; then
  fail "Email HTML content or recipient PII found in logs"
  echo "$EMAIL_HTML_LOGS"
  echo ""
else
  pass "No email content leakage in logs"
fi

# 6. No ThrottlerModule or ThrottlerGuard imports (fully removed)
THROTTLER_IMPORTS=$(grep -rn "ThrottlerModule\|ThrottlerGuard\|from.*throttler" "$BACKEND_SRC" \
  --include='*.ts' \
  --exclude='*.spec.ts' \
  --exclude='*.test.ts' \
  --exclude='*.bak' \
  || true)

if [ -n "$THROTTLER_IMPORTS" ]; then
  fail "ThrottlerModule/ThrottlerGuard imports still present (standardize on RateLimiterGuard)"
  echo "$THROTTLER_IMPORTS"
  echo ""
else
  pass "No ThrottlerModule/ThrottlerGuard imports"
fi

# 7. CORS localhost check — verify localhost origins are inside an isProduction/NODE_ENV block
# Look for localhost in CORS section without any production gating within 3 lines
CORS_UNGATED=$(awk '/Configuring CORS/,/enableCors/' "$BACKEND_SRC/main.ts" 2>/dev/null \
  | grep -n 'localhost' \
  || true)
CORS_GATED=$(awk '/Configuring CORS/,/enableCors/' "$BACKEND_SRC/main.ts" 2>/dev/null \
  | grep -c 'isProduction\|NODE_ENV' \
  || true)

if [ -n "$CORS_UNGATED" ] && [ "$CORS_GATED" -eq 0 ]; then
  fail "Ungated localhost in CORS config (must be behind NODE_ENV check)"
  echo "$CORS_UNGATED"
  echo ""
else
  pass "CORS localhost origins are environment-gated"
fi

echo ""
echo "=== Results ==="
if [ "$FAILURES" -gt 0 ]; then
  echo "❌ $FAILURES gate(s) failed"
  exit 1
else
  echo "✅ All security gates passed"
  exit 0
fi
