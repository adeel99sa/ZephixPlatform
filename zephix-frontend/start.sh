#!/usr/bin/env bash
set -euo pipefail

# Ensure deps exist (include dev deps for Vite)
if [ ! -d node_modules ]; then
  npm ci --include=dev
fi

# Build the app
npm run build

# Serve built files via Vite preview (bind to 0.0.0.0 and Railway $PORT)
# Vite will use dist/ from the build above
npm run preview -- --host 0.0.0.0 --port "${PORT:-3000}"
