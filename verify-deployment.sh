export B="https://zephix-backend-production.up.railway.app"

echo "## Health Check"
curl -s "$B/api/health" | jq .

echo "## Login Test"
LOGIN_JSON=$(curl -s -X POST "$B/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"adeel99sa@yahoo.com\",\"password\":\"ReAdY4wK73967#!@\"}")
echo "$LOGIN_JSON" | jq ".success,.data.user.email"
TOKEN=$(echo "$LOGIN_JSON" | jq -r ".data.accessToken // .accessToken")
echo "Token length: ${#TOKEN}"

echo "## Projects Endpoint (should be 200 now)"
curl -s -i -H "Authorization: Bearer $TOKEN" "$B/api/projects" | sed -n "1,15p"

echo "## KPI Endpoint (should be 200 now)"
curl -s -i -H "Authorization: Bearer $TOKEN" "$B/api/kpi/portfolio" | sed -n "1,15p"

echo "## DB Probe (if included)"
curl -s -H "Authorization: Bearer $TOKEN" "$B/api/obs/db/ping" | jq .
