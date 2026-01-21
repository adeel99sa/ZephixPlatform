#!/bin/bash
# CI guardrail: Block non-canonical WorkspaceAccessService imports
# 
# WorkspaceAccessService must only be imported from:
# src/modules/workspace-access/workspace-access.service.ts
#
# This prevents DI token mismatches that cause NestJS boot failures.

set -e

echo "🔍 Checking for non-canonical WorkspaceAccessService imports..."

# Fail if any import references the old duplicate path
if grep -r "workspaces/services/workspace-access.service" zephix-backend/src; then
  echo ""
  echo "❌ ERROR: Found non-canonical WorkspaceAccessService import"
  echo ""
  echo "WorkspaceAccessService must only be imported from:"
  echo "  src/modules/workspace-access/workspace-access.service.ts"
  echo ""
  echo "Fix: Update imports to use the canonical path:"
  echo "  import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';"
  echo ""
  exit 1
fi

# Also check for local imports in workspaces/services that might reference the old file
if grep -r "from './workspace-access.service'" zephix-backend/src/modules/workspaces/services; then
  echo ""
  echo "❌ ERROR: Found local WorkspaceAccessService import in workspaces/services"
  echo ""
  echo "The duplicate file has been removed. Use the canonical import:"
  echo "  import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';"
  echo ""
  exit 1
fi

echo "✅ All WorkspaceAccessService imports use canonical path"
exit 0
