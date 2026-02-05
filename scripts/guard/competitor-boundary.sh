#!/bin/bash
# Competitor Boundary Guard
# Ensures competitor terms stay in allowed directories only.
# Exit 1 if violations found.

set -e

echo "=== Competitor Boundary Guard ==="
echo ""

# Define competitor terms (case insensitive)
TERMS="Monday\.com|Asana|ClickUp|Linear|Notion|Jira|Trello"

echo "Scanning for competitor terms outside allowed directories..."
echo ""

# Get all matches first, then filter out allowed paths
if command -v rg &> /dev/null; then
  ALL_MATCHES=$(rg -i "$TERMS" --type md --type txt -l 2>/dev/null || true)
else
  ALL_MATCHES=$(grep -r -i -E "$TERMS" --include="*.md" --include="*.txt" -l 2>/dev/null || true)
fi

# Filter out allowed directories
VIOLATIONS=""
while IFS= read -r file; do
  [ -z "$file" ] && continue
  
  # Normalize: remove leading ./
  normalized="${file#./}"
  
  # Skip allowed directories and patterns
  
  # Skip any node_modules anywhere in path
  if [[ "$normalized" == *node_modules* ]]; then
    continue
  fi
  
  # Skip old backups
  if [[ "$normalized" == old-root-backup/* ]]; then
    continue
  fi
  
  case "$normalized" in
    # Allowed doc directories
    docs/competitive/*) continue ;;
    docs/monday-research/*) continue ;;
    docs/archive/*) continue ;;
    docs/vision/*) continue ;;
    docs/MVP/*) continue ;;
    proofs/*) continue ;;
    
    # System directories
    .git/*) continue ;;
    dist/*) continue ;;
    build/*) continue ;;
    
    # Backend/frontend docs
    zephix-backend/docs/*) continue ;;
    zephix-backend/proofs/*) continue ;;
    zephix-frontend/docs/*) continue ;;
    
    # Root-level backend/frontend md files (pending cleanup)
    zephix-backend/*.md) continue ;;
    zephix-frontend/*.md) continue ;;
    zephix-landing/*) continue ;;
    
    # Root-level docs pending cleanup (Commit C deletions)
    # Skip any file that doesn't contain a slash (root-level)
    *)
      if [[ "$normalized" != */* ]]; then
        # Root-level file, skip it (pending deletion)
        continue
      fi
      # Has subdirectory, add to violations
      VIOLATIONS="${VIOLATIONS}${file}"$'\n'
      ;;
  esac
done <<< "$ALL_MATCHES"

# Remove trailing newline
VIOLATIONS=$(echo "$VIOLATIONS" | sed '/^$/d')

if [ -n "$VIOLATIONS" ]; then
  echo "❌ FAILED: Competitor terms found outside allowed directories"
  echo ""
  echo "Files with violations:"
  echo "$VIOLATIONS" | head -20
  echo ""
  
  VIOLATION_COUNT=$(echo "$VIOLATIONS" | wc -l | tr -d ' ')
  echo "Total files with violations: $VIOLATION_COUNT"
  echo ""
  echo "Allowed locations for competitor content:"
  echo "  - docs/competitive/"
  echo "  - docs/monday-research/"
  echo "  - docs/archive/ (historical only)"
  echo "  - docs/vision/ (planning docs)"
  echo "  - docs/MVP/"
  echo "  - proofs/"
  echo "  - zephix-backend/docs/, zephix-frontend/docs/"
  echo ""
  echo "To fix: Move competitor references to docs/competitive/ or remove them."
  exit 1
else
  echo "✅ PASSED: No competitor terms found outside allowed directories"
  exit 0
fi
