#!/bin/bash
# Documentation Reorganization Script
# Moves files to archive and creates stubs for referenced paths

set -e

REPO_ROOT="/Users/malikadeel/Downloads/ZephixApp"
DOCS_ROOT="$REPO_ROOT/docs"
ARCHIVE_ROOT="$DOCS_ROOT/archive"

echo "=== Zephix Documentation Reorganization ==="
echo "Started at: $(date)"

# Phase 1: Move phase docs to archive
echo ""
echo ">>> Moving phase documentation to archive..."

# PHASE1 files
mv_if_exists() {
  if [ -f "$1" ]; then
    mkdir -p "$(dirname "$2")"
    git mv "$1" "$2" 2>/dev/null || mv "$1" "$2"
    echo "  Moved: $(basename "$1")"
  fi
}

# Root-level phase files
mv_if_exists "$REPO_ROOT/PHASE_1_SUMMARY.md" "$ARCHIVE_ROOT/phases/PHASE1/PHASE_1_SUMMARY.md"
mv_if_exists "$REPO_ROOT/PHASE_1_VERIFICATION_REPORT.md" "$ARCHIVE_ROOT/phases/PHASE1/PHASE_1_VERIFICATION_REPORT.md"

mv_if_exists "$REPO_ROOT/PHASE_2A_BILLING_MIGRATION_COMPLETE.md" "$ARCHIVE_ROOT/phases/PHASE2/PHASE_2A_BILLING_MIGRATION_COMPLETE.md"
mv_if_exists "$REPO_ROOT/PHASE_2A_BILLING_MIGRATION.md" "$ARCHIVE_ROOT/phases/PHASE2/PHASE_2A_BILLING_MIGRATION.md"
mv_if_exists "$REPO_ROOT/PHASE_2A_CUSTOM_FIELDS_MIGRATION.md" "$ARCHIVE_ROOT/phases/PHASE2/PHASE_2A_CUSTOM_FIELDS_MIGRATION.md"
mv_if_exists "$REPO_ROOT/PHASE_2A_TASKS_MODULE_MIGRATION.md" "$ARCHIVE_ROOT/phases/PHASE2/PHASE_2A_TASKS_MODULE_MIGRATION.md"
mv_if_exists "$REPO_ROOT/PHASE_2A_VERIFICATION_REPORT.md" "$ARCHIVE_ROOT/phases/PHASE2/PHASE_2A_VERIFICATION_REPORT.md"

mv_if_exists "$REPO_ROOT/PHASE_5_3_CLEANUP_COMPLETE.md" "$ARCHIVE_ROOT/phases/PHASE5/PHASE_5_3_CLEANUP_COMPLETE.md"
mv_if_exists "$REPO_ROOT/PHASE_5_3_SECURITY_FIXES.md" "$ARCHIVE_ROOT/phases/PHASE5/PHASE_5_3_SECURITY_FIXES.md"

mv_if_exists "$REPO_ROOT/PHASE_6_FRONTEND_IMPLEMENTATION_PLAN.md" "$ARCHIVE_ROOT/phases/PHASE6/PHASE_6_FRONTEND_IMPLEMENTATION_PLAN.md"
mv_if_exists "$REPO_ROOT/PHASE_6_IMPLEMENTATION_STATUS.md" "$ARCHIVE_ROOT/phases/PHASE6/PHASE_6_IMPLEMENTATION_STATUS.md"
mv_if_exists "$REPO_ROOT/PHASE_6_MODULE_0_FINDINGS.md" "$ARCHIVE_ROOT/phases/PHASE6/PHASE_6_MODULE_0_FINDINGS.md"

# Docs folder phase files
for f in "$DOCS_ROOT"/PHASE1*.md "$DOCS_ROOT"/PHASE2*.md; do
  [ -f "$f" ] && mv_if_exists "$f" "$ARCHIVE_ROOT/phases/PHASE2/$(basename "$f")"
done

for f in "$DOCS_ROOT"/PHASE3*.md; do
  [ -f "$f" ] && mv_if_exists "$f" "$ARCHIVE_ROOT/phases/PHASE3/$(basename "$f")"
done

for f in "$DOCS_ROOT"/PHASE4*.md; do
  [ -f "$f" ] && mv_if_exists "$f" "$ARCHIVE_ROOT/phases/PHASE4/$(basename "$f")"
done

for f in "$DOCS_ROOT"/PHASE5*.md; do
  [ -f "$f" ] && mv_if_exists "$f" "$ARCHIVE_ROOT/phases/PHASE5/$(basename "$f")"
done

for f in "$DOCS_ROOT"/PHASE6*.md; do
  [ -f "$f" ] && mv_if_exists "$f" "$ARCHIVE_ROOT/phases/PHASE6/$(basename "$f")"
done

for f in "$DOCS_ROOT"/PHASE7*.md; do
  [ -f "$f" ] && mv_if_exists "$f" "$ARCHIVE_ROOT/phases/PHASE7/$(basename "$f")"
done

for f in "$DOCS_ROOT"/PHASE8*.md; do
  [ -f "$f" ] && mv_if_exists "$f" "$ARCHIVE_ROOT/phases/PHASE8/$(basename "$f")"
done

# Phase 2: Move smoke test artifacts
echo ""
echo ">>> Moving smoke test artifacts..."
if [ -d "$DOCS_ROOT/smoke-proof-artifacts" ]; then
  for f in "$DOCS_ROOT/smoke-proof-artifacts"/*.md; do
    [ -f "$f" ] && mv_if_exists "$f" "$ARCHIVE_ROOT/smoke-tests/$(basename "$f")"
  done
fi

# Phase 3: Move debug/diagnostic files
echo ""
echo ">>> Moving debug files..."
mv_if_exists "$REPO_ROOT/DEBUG_ADMIN_ACCESS.md" "$ARCHIVE_ROOT/debug/DEBUG_ADMIN_ACCESS.md"
mv_if_exists "$REPO_ROOT/DIAGNOSTIC_RESULTS.md" "$ARCHIVE_ROOT/debug/DIAGNOSTIC_RESULTS.md"
mv_if_exists "$REPO_ROOT/ROOT_CAUSE_ANALYSIS.md" "$ARCHIVE_ROOT/debug/ROOT_CAUSE_ANALYSIS.md"
mv_if_exists "$REPO_ROOT/ORG_SLUG_DIAGNOSTIC_RESULTS.md" "$ARCHIVE_ROOT/debug/ORG_SLUG_DIAGNOSTIC_RESULTS.md"
mv_if_exists "$REPO_ROOT/LOGIN_DEBUG_SUMMARY.md" "$ARCHIVE_ROOT/debug/LOGIN_DEBUG_SUMMARY.md"
mv_if_exists "$REPO_ROOT/SIGNUP_FLOW_ROOT_CAUSE_ANALYSIS.md" "$ARCHIVE_ROOT/debug/SIGNUP_FLOW_ROOT_CAUSE_ANALYSIS.md"

# Phase 4: Move prompt artifacts
echo ""
echo ">>> Moving prompt artifacts..."
mv_if_exists "$REPO_ROOT/PROMPT_6_1_SUMMARY.md" "$ARCHIVE_ROOT/prompts/PROMPT_6_1_SUMMARY.md"
mv_if_exists "$REPO_ROOT/PROMPT_8_9_10_STATUS.md" "$ARCHIVE_ROOT/prompts/PROMPT_8_9_10_STATUS.md"
mv_if_exists "$DOCS_ROOT/MASTER_CURSOR_PROMPT.md" "$ARCHIVE_ROOT/prompts/MASTER_CURSOR_PROMPT.md"

# Phase 5: Move verification files
echo ""
echo ">>> Moving verification files..."
mv_if_exists "$REPO_ROOT/VERIFICATION_CHECKLIST.md" "$ARCHIVE_ROOT/verifications/VERIFICATION_CHECKLIST.md"
mv_if_exists "$REPO_ROOT/BASELINE_VERIFICATION.md" "$ARCHIVE_ROOT/verifications/BASELINE_VERIFICATION.md"
mv_if_exists "$DOCS_ROOT/VALIDATION_INSTRUCTIONS.md" "$ARCHIVE_ROOT/verifications/VALIDATION_INSTRUCTIONS.md"
mv_if_exists "$DOCS_ROOT/STEP8_VERIFICATION_CHECKLIST.md" "$ARCHIVE_ROOT/verifications/STEP8_VERIFICATION_CHECKLIST.md"
mv_if_exists "$DOCS_ROOT/WORKSPACE_VERIFICATION_CHECKLIST.md" "$ARCHIVE_ROOT/verifications/WORKSPACE_VERIFICATION_CHECKLIST.md"

# Phase 6: Move to-delete candidates
echo ""
echo ">>> Moving delete candidates..."

# Root level delete candidates
for f in \
  "BUILD_ERRORS_CAPTURE.md" \
  "BUILD_ERRORS_SUMMARY.md" \
  "CODE_BLOCKS_VERIFICATION.md" \
  "CODE_REVIEW_BLOCKS.md" \
  "EXACT_CODE_BLOCKS_FOR_REVIEW.md" \
  "FILE_TREE_COMPLETE.md" \
  "FILE_TREE_SUMMARY.md" \
  "FINAL_PUSH_COMPLETE.md" \
  "FINAL_SAFEGUARDS_COMPLETE.md" \
  "IMPLEMENTATION_COMPLETE.md" \
  "JEST_TYPES_FIX_SUMMARY.md" \
  "MERGE_GATE_COMPLETE.md" \
  "PROOF_BUNDLE_COMPLETE.md" \
  "PROOF_CAPTURE_STATUS.md" \
  "SMOKE_TEST_RESULTS.md" \
  "TEST_FIXES_SUMMARY.md" \
  "TEST_TYPE_CHECK_STATUS.md" \
  "TENANCY_FIX_SUMMARY.md" \
  "COMMIT_5_AND_PHASE_7_5_SUMMARY.md" \
  "IMPLEMENTATION_EXECUTION_SUMMARY.md" \
  "WORKSPACES_PROJECTS_HARDENING_SUMMARY.md" \
  "ZEPHIX_STRICT_AUDIT_ADDENDUM.md"
do
  if [ -f "$REPO_ROOT/$f" ]; then
    echo "# DELETE CANDIDATE" > "$ARCHIVE_ROOT/to-delete/$f.tmp"
    echo "# Reason: Historical artifact, superseded or one-time use" >> "$ARCHIVE_ROOT/to-delete/$f.tmp"
    echo "# Original: $REPO_ROOT/$f" >> "$ARCHIVE_ROOT/to-delete/$f.tmp"
    echo "" >> "$ARCHIVE_ROOT/to-delete/$f.tmp"
    cat "$REPO_ROOT/$f" >> "$ARCHIVE_ROOT/to-delete/$f.tmp"
    mv "$ARCHIVE_ROOT/to-delete/$f.tmp" "$ARCHIVE_ROOT/to-delete/$f"
    rm "$REPO_ROOT/$f"
    echo "  Marked for deletion: $f"
  fi
done

echo ""
echo "=== Reorganization complete ==="
echo "Finished at: $(date)"
echo ""
echo "Next steps:"
echo "1. Run: npm run build (both frontend and backend)"
echo "2. Run: scripts/docs/check_doc_links.ts"
echo "3. If validation passes, delete contents of docs/archive/to-delete/"
