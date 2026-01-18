#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
EMAIL="${1:-}"
PASSWORD="${2:-}"

if [[ -z "${EMAIL}" || -z "${PASSWORD}" ]]; then
  echo "Usage: ./run.sh <email> <password>"
  echo "Optional: BASE_URL=http://localhost:3000 ./run.sh <email> <password>"
  exit 1
fi

OUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$OUT_DIR"

req() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local out="$4"

  if [[ -n "$body" ]]; then
    curl -sS -D "${out}.headers.txt" -o "${out}.body.json" \
      -H "Content-Type: application/json" \
      -X "$method" "$url" \
      --data "$body"
  else
    curl -sS -D "${out}.headers.txt" -o "${out}.body.json" \
      -X "$method" "$url"
  fi
}

req_auth() {
  local method="$1"
  local url="$2"
  local token="$3"
  local out="$4"

  curl -sS -D "${out}.headers.txt" -o "${out}.body.json" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -X "$method" "$url"
}

http_status() {
  awk 'BEGIN{code=0} /^HTTP\//{code=$2} END{print code}' "$1"
}

extract_token() {
  local file="$1"
  node - <<'NODE' "$file"
const fs = require("fs");
const p = process.argv[1];
const raw = fs.readFileSync(p, "utf8");
let j;
try { j = JSON.parse(raw); } catch { process.exit(2); }

function pick(o) {
  if (!o || typeof o !== "object") return null;
  return o.accessToken || o.token || o?.data?.accessToken || o?.data?.token || null;
}

const t = pick(j);
if (!t) process.exit(3);
process.stdout.write(t);
NODE
}

extract_first_workspace_slug_or_id() {
  local file="$1"
  node - <<'NODE' "$file"
const fs = require("fs");
const p = process.argv[1];
const raw = fs.readFileSync(p, "utf8");
let j;
try { j = JSON.parse(raw); } catch { process.exit(2); }

const arr =
  Array.isArray(j) ? j :
  Array.isArray(j?.data) ? j.data :
  Array.isArray(j?.items) ? j.items :
  Array.isArray(j?.data?.items) ? j.data.items :
  null;

if (!arr || arr.length === 0) process.exit(3);

const w = arr[0];
const slug = w.slug || w.workspaceSlug || null;
const id = w.id || w.workspaceId || null;

if (slug) { process.stdout.write(`slug:${slug}`); process.exit(0); }
if (id)   { process.stdout.write(`id:${id}`); process.exit(0); }
process.exit(4);
NODE
}

login_body="$(node -e 'console.log(JSON.stringify({email: process.argv[1], password: process.argv[2]}))' "$EMAIL" "$PASSWORD")"

rm -f ./*.headers.txt ./*.body.json ./*.txt 2>/dev/null || true

req "POST" "${BASE_URL}/api/auth/login" "$login_body" "01_login"
echo "HTTP $(http_status 01_login.headers.txt) ${BASE_URL}/api/auth/login" > 01_login_response.txt
cat 01_login.body.json >> 01_login_response.txt

AT="$(extract_token 01_login.body.json || true)"
if [[ -z "${AT}" ]]; then
  echo "" >> 01_login_response.txt
  echo "Token extraction failed. Check 01_login.body.json" >> 01_login_response.txt
  exit 4
fi

req_auth "GET" "${BASE_URL}/api/auth/me" "$AT" "02_me"
echo "HTTP $(http_status 02_me.headers.txt) ${BASE_URL}/api/auth/me" > 02_me_response.txt
cat 02_me.body.json >> 02_me_response.txt

req_auth "GET" "${BASE_URL}/api/workspaces" "$AT" "03_workspaces"
echo "HTTP $(http_status 03_workspaces.headers.txt) ${BASE_URL}/api/workspaces" > 03_workspaces_response.txt
cat 03_workspaces.body.json >> 03_workspaces_response.txt

WSEL="$(extract_first_workspace_slug_or_id 03_workspaces.body.json || true)"
if [[ -z "${WSEL}" ]]; then
  echo "No workspaces returned. Skipping workspace home proof." > 04_workspace_home_response.txt
  exit 0
fi

if [[ "$WSEL" == slug:* ]]; then
  SLUG="${WSEL#slug:}"
  req_auth "GET" "${BASE_URL}/api/workspaces/slug/${SLUG}/home" "$AT" "04_workspace_home"
  echo "HTTP $(http_status 04_workspace_home.headers.txt) ${BASE_URL}/api/workspaces/slug/${SLUG}/home" > 04_workspace_home_response.txt
  cat 04_workspace_home.body.json >> 04_workspace_home_response.txt
  exit 0
fi

if [[ "$WSEL" == id:* ]]; then
  ID="${WSEL#id:}"
  req_auth "GET" "${BASE_URL}/api/workspaces/${ID}/summary" "$AT" "04_workspace_home"
  echo "HTTP $(http_status 04_workspace_home.headers.txt) ${BASE_URL}/api/workspaces/${ID}/summary" > 04_workspace_home_response.txt
  cat 04_workspace_home.body.json >> 04_workspace_home_response.txt
  exit 0
fi

echo "Workspace selector extraction failed." > 04_workspace_home_response.txt
exit 5
