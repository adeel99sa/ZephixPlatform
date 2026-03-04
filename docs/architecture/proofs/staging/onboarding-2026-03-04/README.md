staging_onboarding_smoke_proof

base=https://zephix-backend-staging-staging.up.railway.app
date=2026-03-04
railwayDeploymentId=cc435d4f-d4f0-4a32-af46-e06374722125
x-zephix-env=staging

timestamps_utc
- 01-health-ready.txt: Wed, 04 Mar 2026 18:30:18 GMT
- 02-version.txt: Wed, 04 Mar 2026 18:30:18 GMT
- 04-auth-login.txt: Wed, 04 Mar 2026 18:30:19 GMT
- 05-auth-me.txt: Wed, 04 Mar 2026 18:30:19 GMT
- 06-workspaces-create.txt: Wed, 04 Mar 2026 18:30:19 GMT

exact_curl_commands
BASE="https://zephix-backend-staging-staging.up.railway.app"
OUT="docs/architecture/proofs/staging/onboarding-2026-03-04"
EMAIL="staging+smoke@zephix.dev"
PASS="Password123!"
WS_NAME="Smoke Workspace"
WS_SLUG="smoke-workspace-$(date +%s)"

mkdir -p "$OUT"
rm -f "$OUT/cookiejar.txt"

curl -i "$BASE/api/health/ready" > "$OUT/01-health-ready.txt"
curl -i "$BASE/api/version" > "$OUT/02-version.txt"

CSRF=$(curl -s -c "$OUT/cookiejar.txt" "$BASE/api/auth/csrf" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.csrfToken||j.token||''))}catch(e){process.stdout.write('')}})")
printf "%s\n" "$CSRF" > "$OUT/03-auth-csrf.txt"

curl -i -b "$OUT/cookiejar.txt" -c "$OUT/cookiejar.txt" -H "Content-Type: application/json" -H "X-CSRF-Token: $CSRF" -X POST "$BASE/api/auth/login" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" > "$OUT/04-auth-login.txt"

curl -i -b "$OUT/cookiejar.txt" -c "$OUT/cookiejar.txt" -H "X-CSRF-Token: $CSRF" "$BASE/api/auth/me" > "$OUT/05-auth-me.txt"

curl -i -b "$OUT/cookiejar.txt" -c "$OUT/cookiejar.txt" -H "Content-Type: application/json" -H "X-CSRF-Token: $CSRF" -X POST "$BASE/api/workspaces" -d "{\"name\":\"$WS_NAME\",\"slug\":\"$WS_SLUG\"}" > "$OUT/06-workspaces-create.txt"
