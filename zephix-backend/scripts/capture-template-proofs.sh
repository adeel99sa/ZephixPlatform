#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3000/api}"
OUT_DIR="${OUT_DIR:-./proofs/templates}"
WORKSPACE_ID="${WORKSPACE_ID:?WORKSPACE_ID missing}"
ADMIN_TOKEN="${ADMIN_TOKEN:?ADMIN_TOKEN missing}"
OWNER_TOKEN="${OWNER_TOKEN:?OWNER_TOKEN missing}"
MEMBER_TOKEN="${MEMBER_TOKEN:?MEMBER_TOKEN missing}"

mkdir -p "$OUT_DIR"

req() {
  local name="$1"
  local method="$2"
  local url="$3"
  local token="$4"
  local workspace_header="${5:-}"
  local body="${6:-}"

  local req_file="$OUT_DIR/${name}.request.txt"
  local res_file="$OUT_DIR/${name}.response.txt"

  {
    echo "METHOD: $method"
    echo "URL: $url"
    echo "Authorization: Bearer <redacted>"
    if [[ -n "$workspace_header" ]]; then
      echo "x-workspace-id: $workspace_header"
    fi
    if [[ -n "$body" ]]; then
      echo "BODY:"
      echo "$body"
    fi
  } > "$req_file"

  if [[ -n "$body" ]]; then
    if [[ -n "$workspace_header" ]]; then
      curl -sS -i -X "$method" "$url" \
        -H "Authorization: Bearer $token" \
        -H "x-workspace-id: $workspace_header" \
        -H "Content-Type: application/json" \
        -d "$body" > "$res_file"
    else
      curl -sS -i -X "$method" "$url" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "$body" > "$res_file"
    fi
  else
    if [[ -n "$workspace_header" ]]; then
      curl -sS -i -X "$method" "$url" \
        -H "Authorization: Bearer $token" \
        -H "x-workspace-id: $workspace_header" > "$res_file"
    else
      curl -sS -i -X "$method" "$url" \
        -H "Authorization: Bearer $token" > "$res_file"
    fi
  fi

  local code
  code="$(awk 'toupper($0) ~ /^HTTP\/[0-9.]+/ {print $2; exit}' "$res_file" || true)"
  echo "$name -> $code"
}

echo "Capturing proofs into $OUT_DIR"
echo "API_BASE=$API_BASE"
echo "WORKSPACE_ID=$WORKSPACE_ID"

TIMESTAMP=$(date +%s)
# Create structured template with phases and tasks for instantiation proof
STRUCTURE_JSON="{\"phases\":[{\"name\":\"Phase 1\",\"order\":0,\"tasks\":[{\"name\":\"Task 1\",\"description\":\"First task\"}]}]}"
ORG_TEMPLATE_BODY="{\"name\":\"Proof ORG Template $TIMESTAMP\",\"templateScope\":\"ORG\",\"methodology\":\"agile\"}"
WS_TEMPLATE_BODY="{\"name\":\"Proof WORKSPACE Template $TIMESTAMP\",\"templateScope\":\"WORKSPACE\",\"methodology\":\"agile\",\"structure\":$STRUCTURE_JSON,\"defaultEnabledKPIs\":[\"schedule_variance\"]}"

req "01_admin_create_org_template_no_workspace_header" "POST" "$API_BASE/templates" "$ADMIN_TOKEN" "" "$ORG_TEMPLATE_BODY"
req "02_owner_create_workspace_template_with_header" "POST" "$API_BASE/templates" "$OWNER_TOKEN" "$WORKSPACE_ID" "$WS_TEMPLATE_BODY"
req "03_member_create_template_forbidden" "POST" "$API_BASE/templates" "$MEMBER_TOKEN" "$WORKSPACE_ID" "$WS_TEMPLATE_BODY"

req "04_list_templates_no_workspace_header" "GET" "$API_BASE/templates" "$ADMIN_TOKEN"
req "05_list_templates_with_workspace_header" "GET" "$API_BASE/templates" "$ADMIN_TOKEN" "$WORKSPACE_ID"

# Extract template IDs from prior responses
ORG_TEMPLATE_ID="$(grep -oE '"id"\s*:\s*"[^"]+"' "$OUT_DIR/01_admin_create_org_template_no_workspace_header.response.txt" | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/' || true)"
WS_TEMPLATE_ID="$(grep -oE '"id"\s*:\s*"[^"]+"' "$OUT_DIR/02_owner_create_workspace_template_with_header.response.txt" | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/' || true)"

if [[ -z "$ORG_TEMPLATE_ID" || -z "$WS_TEMPLATE_ID" ]]; then
  echo "⚠️  Failed to extract template IDs. Check response files."
  echo "ORG_TEMPLATE_ID: $ORG_TEMPLATE_ID"
  echo "WS_TEMPLATE_ID: $WS_TEMPLATE_ID"
  exit 1
fi

echo "Extracted ORG_TEMPLATE_ID: $ORG_TEMPLATE_ID"
echo "Extracted WS_TEMPLATE_ID: $WS_TEMPLATE_ID"

req "06_publish_org_template_first" "POST" "$API_BASE/templates/$ORG_TEMPLATE_ID/publish" "$ADMIN_TOKEN" "" ""
req "07_publish_org_template_second" "POST" "$API_BASE/templates/$ORG_TEMPLATE_ID/publish" "$ADMIN_TOKEN" "" ""

# Add structure to workspace template if it wasn't created with structure
# Check if template has structure, if not, patch it
WS_TEMPLATE_STRUCTURE_CHECK="$(grep -o '"structure"[^}]*}' "$OUT_DIR/02_owner_create_workspace_template_with_header.response.txt" | head -n 1 || true)"
if [[ -z "$WS_TEMPLATE_STRUCTURE_CHECK" || "$WS_TEMPLATE_STRUCTURE_CHECK" == '"structure":null' ]]; then
  echo "Adding structure to workspace template..."
  PATCH_STRUCTURE_BODY="{\"structure\":$STRUCTURE_JSON,\"defaultEnabledKPIs\":[\"schedule_variance\"]}"
  req "02b_patch_workspace_template_structure" "PATCH" "$API_BASE/templates/$WS_TEMPLATE_ID" "$OWNER_TOKEN" "$WORKSPACE_ID" "$PATCH_STRUCTURE_BODY"
  # Publish after adding structure
  req "02c_publish_workspace_template" "POST" "$API_BASE/templates/$WS_TEMPLATE_ID/publish" "$OWNER_TOKEN" "$WORKSPACE_ID" ""
fi

# Instantiate workspace template from wrong workspace, create a second workspace id if you have it
WRONG_WORKSPACE_ID="${WRONG_WORKSPACE_ID:-}"
if [[ -n "$WRONG_WORKSPACE_ID" ]]; then
  INSTANTIATE_BODY='{"projectName":"Wrong Workspace Project"}'
  req "08_instantiate_workspace_template_wrong_workspace" "POST" "$API_BASE/templates/$WS_TEMPLATE_ID/instantiate-v5_1" "$ADMIN_TOKEN" "$WRONG_WORKSPACE_ID" "$INSTANTIATE_BODY"
else
  echo "Skipping wrong workspace instantiate, set WRONG_WORKSPACE_ID to capture proof 8A"
fi

INSTANTIATE_OK_BODY='{"projectName":"Proof Project From Workspace Template"}'
req "09_instantiate_workspace_template_correct_workspace" "POST" "$API_BASE/templates/$WS_TEMPLATE_ID/instantiate-v5_1" "$ADMIN_TOKEN" "$WORKSPACE_ID" "$INSTANTIATE_OK_BODY"

req "10_legacy_instantiate_route_gone" "POST" "$API_BASE/templates/$WS_TEMPLATE_ID/instantiate" "$ADMIN_TOKEN" "$WORKSPACE_ID" "{}"

echo ""
echo "Done. Files saved under $OUT_DIR"
echo ""
echo "Summary:"
for file in "$OUT_DIR"/*.response.txt; do
  if [[ -f "$file" ]]; then
    name=$(basename "$file" .response.txt)
    code=$(awk 'toupper($0) ~ /^HTTP\/[0-9.]+/ {print $2; exit}' "$file" || echo "N/A")
    echo "  $name -> $code"
  fi
done
