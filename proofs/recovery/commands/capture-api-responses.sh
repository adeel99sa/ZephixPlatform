#!/bin/bash
# Capture API responses for MVP golden path verification
# Run this after starting backend and frontend
# Date: $(date +%Y%m%d)

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="proofs/recovery/commands/${TIMESTAMP}"
mkdir -p "$OUTPUT_DIR"

echo "🔍 Capturing API responses..."
echo "Output directory: $OUTPUT_DIR"
echo ""

# Check if backend is running
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "❌ Backend not running on http://localhost:3000"
  echo "Please start the backend first"
  exit 1
fi

# You need to set these from your actual login
# Replace with actual values after logging in
TOKEN="${ZEPHIX_TOKEN:-}"
ORG_ID="${ZEPHIX_ORG_ID:-}"
USER_ID="${ZEPHIX_USER_ID:-}"
WORKSPACE_ID="${ZEPHIX_WORKSPACE_ID:-}"

if [ -z "$TOKEN" ]; then
  echo "⚠️  Set ZEPHIX_TOKEN environment variable"
  echo "   Example: export ZEPHIX_TOKEN='your-jwt-token'"
  echo ""
  echo "To get token:"
  echo "1. Login via frontend"
  echo "2. Open browser DevTools > Application > Local Storage"
  echo "3. Copy value of 'zephix.at'"
  echo "4. export ZEPHIX_TOKEN='<value>'"
  exit 1
fi

echo "📡 1. GET /api/auth/me"
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/auth/me \
  | jq '.' > "$OUTPUT_DIR/01-auth-me.json" || echo "Failed" > "$OUTPUT_DIR/01-auth-me.json"
echo "   Saved to: $OUTPUT_DIR/01-auth-me.json"
echo ""

echo "📡 2. GET /api/workspaces"
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/workspaces \
  | jq '.' > "$OUTPUT_DIR/02-workspaces-list.json" || echo "Failed" > "$OUTPUT_DIR/02-workspaces-list.json"
echo "   Saved to: $OUTPUT_DIR/02-workspaces-list.json"
echo ""

if [ -n "$WORKSPACE_ID" ]; then
  echo "📡 3. GET /api/workspaces/$WORKSPACE_ID/role"
  curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:3000/api/workspaces/$WORKSPACE_ID/role" \
    | jq '.' > "$OUTPUT_DIR/03-workspace-role.json" || echo "Failed" > "$OUTPUT_DIR/03-workspace-role.json"
  echo "   Saved to: $OUTPUT_DIR/03-workspace-role.json"
  echo ""
fi

if [ -n "$WORKSPACE_ID" ]; then
  echo "📡 4. POST /api/projects (test create)"
  curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Test Project $(date +%s)\",\"workspaceId\":\"$WORKSPACE_ID\"}" \
    http://localhost:3000/api/projects \
    | jq '.' > "$OUTPUT_DIR/04-create-project-response.json" || echo "Failed" > "$OUTPUT_DIR/04-create-project-response.json"
  echo "   Saved to: $OUTPUT_DIR/04-create-project-response.json"
  echo ""
fi

echo "✅ Capture complete!"
echo "📁 Files saved in: $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "1. Review the JSON files"
echo "2. Check backend logs for any errors"
echo "3. Share the response bodies with the team"
