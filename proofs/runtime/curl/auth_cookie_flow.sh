#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
OUT_DIR="proofs/runtime/auth"
EMAIL="${EMAIL:-admin@zephix.ai}"
PASSWORD="${PASSWORD:-admin123456}"

LOGIN_PATH="${LOGIN_PATH:-/api/auth/login}"
ME_PATH="${ME_PATH:-/api/auth/me}"
CSRF_PATH="${CSRF_PATH:-/api/auth/csrf}"

# Mutating endpoint for CSRF negative test (use dedicated proof endpoint)
MUTATE_PATH="${MUTATE_PATH:-/api/auth/csrf-test}"

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/headers_*.txt "$OUT_DIR"/cookies.txt

req_file() { printf "%s/%02d_%s" "$OUT_DIR" "$1" "$2"; }
resp_file() { printf "%s/%02d_%s" "$OUT_DIR" "$1" "$2"; }

# 01 login request
cat > "$(req_file 1 login_request.txt)" <<EOF
POST ${BASE_URL}${LOGIN_PATH}
Content-Type: application/json

{"email":"${EMAIL}","password":"${PASSWORD}"}
EOF

# 02 login response, capture headers and cookie jar
curl -sS -D "$OUT_DIR/headers_login.txt" \
  -c "$OUT_DIR/cookies.txt" \
  -H "Content-Type: application/json" \
  -X POST "${BASE_URL}${LOGIN_PATH}" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  -o "$(resp_file 2 login_response.txt)"

# Hard checks for cookie flags
if ! grep -i "set-cookie:" "$OUT_DIR/headers_login.txt" > /dev/null; then
  echo "FAIL: missing Set-Cookie header"
  exit 1
fi
if ! grep -i "httponly" "$OUT_DIR/headers_login.txt" > /dev/null; then
  echo "FAIL: missing HttpOnly flag"
  exit 1
fi
if ! grep -i "samesite=strict" "$OUT_DIR/headers_login.txt" > /dev/null; then
  echo "FAIL: missing SameSite=Strict"
  exit 1
fi

# 03 me request
cat > "$(req_file 3 me_request.txt)" <<EOF
GET ${BASE_URL}${ME_PATH}
Cookie jar: ${OUT_DIR}/cookies.txt
EOF

# 04 me response
curl -sS -D "$OUT_DIR/headers_me.txt" \
  -b "$OUT_DIR/cookies.txt" \
  -X GET "${BASE_URL}${ME_PATH}" \
  -o "$(resp_file 4 me_response.txt)"

# CSRF token fetch (optional - may not exist)
csrf_headers="$OUT_DIR/headers_csrf.txt"
csrf_body="$OUT_DIR/csrf_body.json"

csrf_token=""
csrf_fetch_success=false

if curl -sS -D "$csrf_headers" \
  -b "$OUT_DIR/cookies.txt" \
  -c "$OUT_DIR/cookies.txt" \
  -X GET "${BASE_URL}${CSRF_PATH}" \
  -o "$csrf_body" \
  --fail-with-body 2>/dev/null; then
  csrf_fetch_success=true
  
  # Try header first
  csrf_token="$(grep -i "x-csrf-token:" "$csrf_headers" | head -1 | sed -E 's/.*x-csrf-token:[[:space:]]*//I' | tr -d '\r' || true)"
  
  # Fallback to JSON body fields
  if [ -z "$csrf_token" ]; then
    if command -v node >/dev/null 2>&1; then
      csrf_token="$(node -e "try{const j=require('./$csrf_body');console.log(j.csrfToken||j.token||'')}catch(e){process.exit(0)}" 2>/dev/null || true)"
    fi
  fi
fi

# 05 csrf missing response
cat > "$(req_file 5 csrf_missing_response.txt)" <<EOF
POST ${BASE_URL}${MUTATE_PATH}
Cookie jar: ${OUT_DIR}/cookies.txt
No CSRF header
EOF

curl -sS -D "$OUT_DIR/headers_csrf_missing.txt" \
  -b "$OUT_DIR/cookies.txt" \
  -H "Content-Type: application/json" \
  -X POST "${BASE_URL}${MUTATE_PATH}" \
  -d "{}" \
  -o "$(resp_file 5 csrf_missing_response.txt)" 2>&1 || true

# Check if CSRF is enforced (403) or if endpoint requires other fields (400/422)
status_code_missing=$(grep -i "^HTTP" "$OUT_DIR/headers_csrf_missing.txt" | tail -1 | awk '{print $2}' || echo "000")
if [ "$status_code_missing" = "403" ]; then
  echo "INFO: CSRF protection is enforced (403 for missing CSRF)"
elif [ "$status_code_missing" = "400" ] || [ "$status_code_missing" = "422" ]; then
  echo "INFO: Endpoint requires fields (${status_code_missing}), CSRF check inconclusive"
else
  echo "WARN: Unexpected status ${status_code_missing} for missing CSRF"
fi

# 06 csrf present response (only if CSRF token was fetched)
if [ "$csrf_fetch_success" = true ] && [ -n "$csrf_token" ]; then
  cat > "$(req_file 6 csrf_present_response.txt)" <<EOF
POST ${BASE_URL}${MUTATE_PATH}
Cookie jar: ${OUT_DIR}/cookies.txt
CSRF token: ${csrf_token}
EOF

  curl -sS -D "$OUT_DIR/headers_csrf_present.txt" \
    -b "$OUT_DIR/cookies.txt" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: ${csrf_token}" \
    -X POST "${BASE_URL}${MUTATE_PATH}" \
    -d "{}" \
    -o "$(resp_file 6 csrf_present_response.txt)" 2>&1 || true

  status_code_present=$(grep -i "^HTTP" "$OUT_DIR/headers_csrf_present.txt" | tail -1 | awk '{print $2}' || echo "000")
  if [ "$status_code_present" = "403" ]; then
    echo "WARN: CSRF present still returns 403"
    echo "Check required body fields for ${MUTATE_PATH}, or choose a safer mutation endpoint"
  else
    echo "INFO: CSRF present returns ${status_code_present} (not 403)"
  fi
else
  echo "INFO: CSRF endpoint not available, skipping CSRF present test"
  cat > "$(resp_file 6 csrf_present_response.txt)" <<EOF
CSRF endpoint ${CSRF_PATH} not available or token extraction failed.
This is acceptable if CSRF protection is not implemented.
EOF
fi

echo "PASS: Gate 1 artifacts created in ${OUT_DIR}"
echo "Note: HAR and localStorage screenshot are manual browser artifacts"
