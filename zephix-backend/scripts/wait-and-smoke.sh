#!/bin/bash
set -e

BASE_URL="${API_URL:-http://localhost:3000}"
MAX_WAIT=60
WAIT_INTERVAL=2

echo "⏳ Waiting for server at $BASE_URL to be ready..."

for i in $(seq 1 $MAX_WAIT); do
  if curl -s -f "$BASE_URL/health" > /dev/null 2>&1; then
    echo "✅ Server is ready!"
    exit 0
  fi
  echo "   Attempt $i/$MAX_WAIT..."
  sleep $WAIT_INTERVAL
done

echo "❌ Server did not become ready within ${MAX_WAIT}s"
exit 1





