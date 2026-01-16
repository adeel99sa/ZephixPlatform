#!/usr/bin/env bash
set -euo pipefail

# Lint only changed TypeScript files in a PR
# This enforces zero lint errors on new/changed code while allowing existing debt

# Detect base branch (default to origin/main)
BASE_BRANCH="${BASE_BRANCH:-origin/main}"

# Get changed files
CHANGED_FILES=$(git diff --name-only "$BASE_BRANCH...HEAD" | grep -E '\.(ts|tsx)$' || true)

# Filter out dist, node_modules, migrations output, etc.
FILTERED_FILES=$(echo "$CHANGED_FILES" | grep -v -E '(dist|node_modules|\.d\.ts|migrations/.*\.js$)' || true)

# If no files changed, exit successfully
if [ -z "$FILTERED_FILES" ]; then
  echo "✅ No TypeScript files changed, skipping lint"
  exit 0
fi

# Convert to array for eslint
FILE_ARRAY=()
while IFS= read -r file; do
  if [ -f "$file" ]; then
    FILE_ARRAY+=("$file")
  fi
done <<< "$FILTERED_FILES"

if [ ${#FILE_ARRAY[@]} -eq 0 ]; then
  echo "✅ No valid TypeScript files to lint"
  exit 0
fi

echo "🔍 Linting ${#FILE_ARRAY[@]} changed file(s):"
printf '%s\n' "${FILE_ARRAY[@]}"

# Run eslint on changed files only
npx eslint "${FILE_ARRAY[@]}" --max-warnings 0

echo "✅ All changed files pass lint"
