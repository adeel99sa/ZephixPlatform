#!/usr/bin/env bash
# B1 end-to-end smoke (v2) — runs against deployed PR2 + hotfix.
#
# Step f (new-user invite accept) now uses the canonical CSRF flow per
# scripts/smoke/CSRF_FLOW.md: GET /auth/csrf in a fresh cookie jar, then
# POST with both the cookie jar and X-CSRF-Token header.
#
# Steps mirror the operator's test plan from the PR2 review verdict:
#   a. login as demo admin
#   b. POST /auth/mfa/enroll -> QR + secret
#   c. POST /auth/mfa/verify with computed TOTP -> mfa_enabled flips true
#   d. POST /org/users/invite -> invitation persisted
#   e. GET /invitations/:token (no auth) -> preview returned
#   f. POST /invitations/:token/accept (new-user, fullName+password)
#      with proper CSRF flow -> 201 + tokens
#   g. PATCH /org/users/:demoUserId attempted demote -> expect 422
#      LAST_ADMIN_DEMOTE_BLOCKED (only meaningful if demo is sole admin)
#      Pre-hotfix this returned 500 with `column uo.is_active does not
#      exist` — that 500→422 transition is the empirical hotfix proof.
#   cleanup: DELETE /auth/mfa to disable MFA on demo

set -uo pipefail

BASE='https://zephix-backend-staging-staging.up.railway.app/api/v1'
EMAIL='demo@zephix.ai'
PASSWORD='demo123456'
COOKIE_JAR=$(mktemp)
TIMESTAMP=$(date +%s)
INVITE_EMAIL="b1-smoke-${TIMESTAMP}@example.local"
NEW_USER_PASSWORD='SmokeAccept2026!'
NEW_USER_FULLNAME='B1 Smoke Test User'

PASS_COUNT=0
FAIL_COUNT=0

pass() { echo "  ✓ PASS  $1"; PASS_COUNT=$((PASS_COUNT+1)); }
fail() { echo "  ✗ FAIL  $1 — $2"; FAIL_COUNT=$((FAIL_COUNT+1)); }

# ── Step a: login (auth flow's CSRF) ──────────────────────────────────────
echo "=== Step a: login as $EMAIL ==="
CSRF_RESP=$(curl -s -c "$COOKIE_JAR" "$BASE/auth/csrf")
CSRF=$(echo "$CSRF_RESP" | python3 -c "import sys,json;d=json.loads(sys.stdin.read());print(d.get('data',{}).get('csrfToken') or d.get('csrfToken') or '')")
[ -z "$CSRF" ] && { fail "csrf" "no token"; exit 1; }

LOGIN_RESP=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "X-CSRF-Token: $CSRF" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  "$BASE/auth/login")
ACCESS=$(echo "$LOGIN_RESP" | python3 -c "import sys,json;d=json.loads(sys.stdin.read());print(d.get('data',{}).get('accessToken') or d.get('accessToken') or '')")
DEMO_USER_ID=$(echo "$LOGIN_RESP" | python3 -c "import sys,json;d=json.loads(sys.stdin.read());print(d.get('data',{}).get('user',{}).get('id') or d.get('user',{}).get('id') or '')")
DEMO_ORG_ID=$(echo "$LOGIN_RESP" | python3 -c "import sys,json;d=json.loads(sys.stdin.read());print(d.get('data',{}).get('organizationId') or d.get('organizationId') or '')")
[ -z "$ACCESS" ] && { fail "login" "no accessToken"; exit 1; }
pass "login (userId=${DEMO_USER_ID:0:8}…, orgId=${DEMO_ORG_ID:0:8}…)"

# ── Step b: enroll MFA ────────────────────────────────────────────────────
echo "=== Step b: POST /auth/mfa/enroll ==="
ENROLL_RESP=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Authorization: Bearer $ACCESS" -H "X-CSRF-Token: $CSRF" -H "Content-Type: application/json" \
  -X POST "$BASE/auth/mfa/enroll")
SECRET=$(echo "$ENROLL_RESP" | python3 -c "import sys,json;d=json.loads(sys.stdin.read());print(d.get('data',{}).get('secret') or d.get('secret') or '')")
QR_HEAD=$(echo "$ENROLL_RESP" | python3 -c "import sys,json;d=json.loads(sys.stdin.read());u=d.get('data',{}).get('qrCodeDataUrl') or d.get('qrCodeDataUrl') or '';print(u[:30])")
if [ -n "$SECRET" ] && [[ "$QR_HEAD" == data:image/png* ]]; then
  pass "enroll: secret returned + QR data URL prefix correct"
else
  fail "enroll" "secret=$SECRET qr_head=$QR_HEAD"
fi

# ── Step c: verify with computed TOTP ─────────────────────────────────────
echo "=== Step c: compute TOTP and POST /auth/mfa/verify ==="
TOTP=$(node -e "
const otplib = require('/Users/malikadeel/Downloads/ZephixApp-main-sync/zephix-backend/node_modules/otplib');
console.log(otplib.authenticator.generate('$SECRET'));
")
[ -z "$TOTP" ] && { fail "totp-generate" "node failed"; exit 1; }
echo "  computed TOTP: $TOTP"

VERIFY_RESP=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -w '\nHTTP=%{http_code}' \
  -H "Authorization: Bearer $ACCESS" -H "X-CSRF-Token: $CSRF" -H "Content-Type: application/json" \
  -d "{\"code\":\"$TOTP\"}" \
  -X POST "$BASE/auth/mfa/verify")
VERIFY_HTTP=$(echo "$VERIFY_RESP" | tail -1 | sed 's/HTTP=//')
VERIFY_BODY=$(echo "$VERIFY_RESP" | sed '$d')
if [ "$VERIFY_HTTP" = "200" ]; then
  MFA_FLAG=$(echo "$VERIFY_BODY" | python3 -c "import sys,json;d=json.loads(sys.stdin.read());print(d.get('data',{}).get('mfaEnabled') or d.get('mfaEnabled'))")
  if [ "$MFA_FLAG" = "True" ]; then
    pass "verify: mfaEnabled=true"
  else
    fail "verify" "http=200 but mfaEnabled=$MFA_FLAG body=$VERIFY_BODY"
  fi
else
  fail "verify" "http=$VERIFY_HTTP body=$VERIFY_BODY"
fi

# ── Step d: org invite ────────────────────────────────────────────────────
echo "=== Step d: POST /org/users/invite for $INVITE_EMAIL ==="
INVITE_RESP=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -w '\nHTTP=%{http_code}' \
  -H "Authorization: Bearer $ACCESS" -H "X-CSRF-Token: $CSRF" -H "Content-Type: application/json" \
  -d "{\"email\":\"$INVITE_EMAIL\",\"orgRole\":\"MEMBER\"}" \
  -X POST "$BASE/org/users/invite")
INVITE_HTTP=$(echo "$INVITE_RESP" | tail -1 | sed 's/HTTP=//')
if [ "$INVITE_HTTP" = "201" ] || [ "$INVITE_HTTP" = "200" ]; then
  pass "invite: http=$INVITE_HTTP"
else
  fail "invite" "http=$INVITE_HTTP body=$(echo "$INVITE_RESP" | sed '$d')"
fi

sleep 1
# Fetch the raw token from auth_outbox via Railway DB
echo "=== Step d.1: fetch raw invitation token from auth_outbox ==="
RAW_TOKEN=$(railway run -s Postgres -e staging -- bash -c "psql \"\$DATABASE_PUBLIC_URL\" -t -A -c \"SELECT payload_json->>'token' FROM auth_outbox WHERE type='auth.invite.created' AND payload_json->>'email'='$INVITE_EMAIL' ORDER BY created_at DESC LIMIT 1;\"" 2>/dev/null | tr -d '\r' | head -1)
if [ -n "$RAW_TOKEN" ]; then
  pass "raw token retrieved from auth_outbox (length=${#RAW_TOKEN})"
else
  fail "raw-token-fetch" "empty"
  exit 1
fi

# ── Step e: GET /invitations/:token (no auth) ─────────────────────────────
echo "=== Step e: GET /invitations/$RAW_TOKEN (PUBLIC, no auth) ==="
PREVIEW_RESP=$(curl -s -w '\nHTTP=%{http_code}' "$BASE/invitations/$RAW_TOKEN")
PREVIEW_HTTP=$(echo "$PREVIEW_RESP" | tail -1 | sed 's/HTTP=//')
PREVIEW_BODY=$(echo "$PREVIEW_RESP" | sed '$d')
if [ "$PREVIEW_HTTP" = "200" ]; then
  PREVIEW_EMAIL=$(echo "$PREVIEW_BODY" | python3 -c "import sys,json;d=json.loads(sys.stdin.read());print(d.get('data',{}).get('email') or d.get('email'))")
  if [ "$PREVIEW_EMAIL" = "$INVITE_EMAIL" ]; then
    pass "preview: email=$PREVIEW_EMAIL"
  else
    fail "preview-email" "expected=$INVITE_EMAIL got=$PREVIEW_EMAIL"
  fi
else
  fail "preview" "http=$PREVIEW_HTTP body=$PREVIEW_BODY"
fi

# ── Step f: accept (new user) — CSRF FLOW per CSRF_FLOW.md §3 ─────────────
echo "=== Step f: POST /invitations/$RAW_TOKEN/accept (NEW USER + CSRF flow) ==="

# Acquire a FRESH CSRF token in a new cookie jar — the unauth path doesn't
# share auth cookies with the demo user's session. This is the canonical
# pattern documented in scripts/smoke/CSRF_FLOW.md §3.
ANON_JAR=$(mktemp)
ANON_CSRF_RESP=$(curl -s -c "$ANON_JAR" "$BASE/auth/csrf")
ANON_CSRF=$(echo "$ANON_CSRF_RESP" | python3 -c "import sys,json;d=json.loads(sys.stdin.read());print(d.get('data',{}).get('csrfToken') or d.get('csrfToken') or '')")
[ -z "$ANON_CSRF" ] && { fail "anon-csrf" "no token"; exit 1; }

ACCEPT_RESP=$(curl -s -b "$ANON_JAR" -c "$ANON_JAR" -w '\nHTTP=%{http_code}' \
  -H "X-CSRF-Token: $ANON_CSRF" \
  -H "Content-Type: application/json" \
  -d "{\"fullName\":\"$NEW_USER_FULLNAME\",\"password\":\"$NEW_USER_PASSWORD\"}" \
  -X POST "$BASE/invitations/$RAW_TOKEN/accept")
ACCEPT_HTTP=$(echo "$ACCEPT_RESP" | tail -1 | sed 's/HTTP=//')
ACCEPT_BODY=$(echo "$ACCEPT_RESP" | sed '$d')
if [ "$ACCEPT_HTTP" = "201" ]; then
  NEW_USER_TOKEN=$(echo "$ACCEPT_BODY" | python3 -c "import sys,json;d=json.loads(sys.stdin.read());print((d.get('data',{}).get('accessToken') or d.get('accessToken') or '')[:20])")
  if [ -n "$NEW_USER_TOKEN" ]; then
    pass "accept (new user): http=201 + accessToken issued (head=${NEW_USER_TOKEN}…)"
  else
    fail "accept-token" "201 but no accessToken in body"
  fi
else
  fail "accept" "http=$ACCEPT_HTTP body=$ACCEPT_BODY"
fi
rm -f "$ANON_JAR"


# ── Step g: attempted last-admin demote ───────────────────────────────────
# Hotfix verification — pre-hotfix this returned 500 with "column uo.is_active
# does not exist". Post-hotfix it returns one of:
#   • 422 LAST_ADMIN_DEMOTE_BLOCKED — when target IS the sole admin
#   • 200 — when target is one of multiple admins (we revert in that case)
# Both prove the SQL column resolution works against the real schema.
# A 500 response means the hotfix has NOT deployed.
echo "=== Step g: PATCH /org/users/$DEMO_USER_ID with orgRole=MEMBER (last-admin guard) ==="
DEMOTE_RESP=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -w '\nHTTP=%{http_code}' \
  -H "Authorization: Bearer $ACCESS" -H "X-CSRF-Token: $CSRF" -H "Content-Type: application/json" \
  -d '{"orgRole":"MEMBER"}' \
  -X PATCH "$BASE/org/users/$DEMO_USER_ID")
DEMOTE_HTTP=$(echo "$DEMOTE_RESP" | tail -1 | sed 's/HTTP=//')
DEMOTE_BODY=$(echo "$DEMOTE_RESP" | sed '$d')

case "$DEMOTE_HTTP" in
  422)
    DEMOTE_CODE=$(echo "$DEMOTE_BODY" | python3 -c "import sys,json;d=json.loads(sys.stdin.read());r=d.get('error') or d;print(r.get('code') or '')")
    if [ "$DEMOTE_CODE" = "LAST_ADMIN_DEMOTE_BLOCKED" ]; then
      pass "last-admin-demote: 422 LAST_ADMIN_DEMOTE_BLOCKED (sole admin; HOTFIX VERIFIED — pre-hotfix this was 500)"
    else
      fail "last-admin-demote-code" "http=422 but code=$DEMOTE_CODE body=$DEMOTE_BODY"
    fi
    ;;
  200)
    echo "  ⚠  multi-admin org → demote succeeded; reverting demo to ADMIN…"
    REVERT_RESP=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -w '\nHTTP=%{http_code}' \
      -H "Authorization: Bearer $ACCESS" -H "X-CSRF-Token: $CSRF" -H "Content-Type: application/json" \
      -d '{"orgRole":"ADMIN"}' \
      -X PATCH "$BASE/org/users/$DEMO_USER_ID")
    REVERT_HTTP=$(echo "$REVERT_RESP" | tail -1 | sed 's/HTTP=//')
    if [ "$REVERT_HTTP" = "200" ]; then
      pass "last-admin-demote: 200 + revert ok (multi-admin org; HOTFIX VERIFIED — controller path executed without SQL error)"
    else
      fail "last-admin-demote-revert" "demote was 200 but revert returned http=$REVERT_HTTP — demo may be left as MEMBER"
    fi
    ;;
  500)
    fail "last-admin-demote" "http=500 — HOTFIX NOT DEPLOYED. body=$DEMOTE_BODY"
    ;;
  *)
    fail "last-admin-demote" "unexpected http=$DEMOTE_HTTP body=$DEMOTE_BODY"
    ;;
esac

# ── Cleanup: disable MFA on demo so we don't leave it enrolled ────────────
echo "=== Cleanup: DELETE /auth/mfa to disable MFA on demo user ==="
CLEANUP_RESP=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -w '\nHTTP=%{http_code}' \
  -H "Authorization: Bearer $ACCESS" -H "X-CSRF-Token: $CSRF" -H "Content-Type: application/json" \
  -d "{\"currentPassword\":\"$PASSWORD\"}" \
  -X DELETE "$BASE/auth/mfa")
CLEANUP_HTTP=$(echo "$CLEANUP_RESP" | tail -1 | sed 's/HTTP=//')
if [ "$CLEANUP_HTTP" = "200" ]; then
  echo "  ✓ MFA disabled on demo user"
else
  echo "  ⚠  MFA cleanup: http=$CLEANUP_HTTP body=$(echo "$CLEANUP_RESP" | sed '$d')"
fi

rm -f "$COOKIE_JAR"

echo ""
echo "============================================================"
echo "B1 e2e smoke (v2 — CSRF flow per scripts/smoke/CSRF_FLOW.md):"
echo "  $PASS_COUNT PASS / $FAIL_COUNT FAIL"
echo "============================================================"
[ "$FAIL_COUNT" -eq 0 ]
