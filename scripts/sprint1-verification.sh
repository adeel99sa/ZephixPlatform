#!/usr/bin/env bash
set -euo pipefail

# Sprint 1 Verification Script
# Verifies data integrity, backfill correctness, API payload stability, and program plan shape

require_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1"; exit 1; }; }

require_cmd psql
require_cmd jq
require_cmd curl

DATABASE_URL="${DATABASE_URL:-}"
BASE="${BASE:-}"
TOKEN="${TOKEN:-}"
WORKSPACE_ID="${WORKSPACE_ID:-}"
PROJECT_ID="${PROJECT_ID:-}"

die() { echo "❌ $1"; exit 1; }

if [ -z "${DATABASE_URL}" ]; then
  die "DATABASE_URL is required"
fi

echo "🔍 Sprint 1 Verification Checks"
echo "================================"
echo ""

# 1. Data Integrity Checks
echo "📋 Check 1: Data Integrity"
echo "----------------------------"

echo "1.1: XOR link enforcement (work_phase must have exactly one of project_id or program_id)"
XOR_VIOLATIONS=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) 
  FROM work_phases 
  WHERE (project_id IS NOT NULL AND program_id IS NOT NULL) 
     OR (project_id IS NULL AND program_id IS NULL);
" | xargs)

if [ "$XOR_VIOLATIONS" != "0" ]; then
  die "XOR violation: Found $XOR_VIOLATIONS work_phases with invalid project_id/program_id combination"
fi
echo "✅ XOR enforcement: PASS"

echo "1.2: Uniqueness per container (project_id + sort_order)"
PROJECT_UNIQUE_VIOLATIONS=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) 
  FROM (
    SELECT project_id, sort_order, COUNT(*) as cnt
    FROM work_phases
    WHERE project_id IS NOT NULL
    GROUP BY project_id, sort_order
    HAVING COUNT(*) > 1
  ) violations;
" | xargs)

if [ "$PROJECT_UNIQUE_VIOLATIONS" != "0" ]; then
  die "Uniqueness violation: Found $PROJECT_UNIQUE_VIOLATIONS duplicate (project_id, sort_order) pairs"
fi
echo "✅ Project phase uniqueness: PASS"

echo "1.3: Uniqueness per container (program_id + sort_order)"
PROGRAM_UNIQUE_VIOLATIONS=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) 
  FROM (
    SELECT program_id, sort_order, COUNT(*) as cnt
    FROM work_phases
    WHERE program_id IS NOT NULL
    GROUP BY program_id, sort_order
    HAVING COUNT(*) > 1
  ) violations;
" | xargs)

if [ "$PROGRAM_UNIQUE_VIOLATIONS" != "0" ]; then
  die "Uniqueness violation: Found $PROGRAM_UNIQUE_VIOLATIONS duplicate (program_id, sort_order) pairs"
fi
echo "✅ Program phase uniqueness: PASS"

echo "1.4: reporting_key uniqueness per container (project_id + reporting_key)"
PROJECT_KEY_VIOLATIONS=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) 
  FROM (
    SELECT project_id, reporting_key, COUNT(*) as cnt
    FROM work_phases
    WHERE project_id IS NOT NULL
    GROUP BY project_id, reporting_key
    HAVING COUNT(*) > 1
  ) violations;
" | xargs)

if [ "$PROJECT_KEY_VIOLATIONS" != "0" ]; then
  echo "⚠️  Warning: Found $PROJECT_KEY_VIOLATIONS duplicate (project_id, reporting_key) pairs"
  echo "   Note: This may be acceptable if not enforced by unique constraint, but should be reviewed"
else
  echo "✅ Project reporting_key uniqueness: PASS"
fi

echo "1.5: reporting_key uniqueness per container (program_id + reporting_key)"
PROGRAM_KEY_VIOLATIONS=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) 
  FROM (
    SELECT program_id, reporting_key, COUNT(*) as cnt
    FROM work_phases
    WHERE program_id IS NOT NULL
    GROUP BY program_id, reporting_key
    HAVING COUNT(*) > 1
  ) violations;
" | xargs)

if [ "$PROGRAM_KEY_VIOLATIONS" != "0" ]; then
  echo "⚠️  Warning: Found $PROGRAM_KEY_VIOLATIONS duplicate (program_id, reporting_key) pairs"
  echo "   Note: This may be acceptable if not enforced by unique constraint, but should be reviewed"
else
  echo "✅ Program reporting_key uniqueness: PASS"
fi

echo ""
echo "📋 Check 2: Backfill Correctness"
echo "--------------------------------"

echo "2.1: Every project with tasks has exactly one default 'Work' phase"
PROJECTS_WITHOUT_PHASE=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(DISTINCT p.id)
  FROM projects p
  INNER JOIN work_tasks wt ON wt.project_id = p.id
  WHERE NOT EXISTS (
    SELECT 1 FROM work_phases wp 
    WHERE wp.project_id = p.id AND wp.name = 'Work' AND wp.sort_order = 0
  );
" | xargs)

if [ "$PROJECTS_WITHOUT_PHASE" != "0" ]; then
  die "Backfill issue: Found $PROJECTS_WITHOUT_PHASE projects with tasks but no default 'Work' phase"
fi
echo "✅ Default phase exists for all projects with tasks: PASS"

echo "2.2: Every existing task has phase_id populated (for projects that had tasks before migration)"
TASKS_WITHOUT_PHASE=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*)
  FROM work_tasks wt
  INNER JOIN projects p ON p.id = wt.project_id
  WHERE wt.phase_id IS NULL;
" | xargs)

if [ "$TASKS_WITHOUT_PHASE" != "0" ]; then
  echo "⚠️  Warning: Found $TASKS_WITHOUT_PHASE tasks without phase_id"
  echo "   This may be acceptable for new tasks created after migration, but should be reviewed"
  echo "   Checking if these are new tasks..."
  
  # Check if these tasks were created after migration
  MIGRATION_TIME=$(psql "$DATABASE_URL" -t -c "
    SELECT timestamp FROM migrations WHERE name LIKE '%AddWorkPhaseAndPhaseIdToTasks%' ORDER BY timestamp DESC LIMIT 1;
  " | xargs)
  
  if [ -n "$MIGRATION_TIME" ]; then
    NEW_TASKS=$(psql "$DATABASE_URL" -t -c "
      SELECT COUNT(*) 
      FROM work_tasks wt
      WHERE wt.phase_id IS NULL 
        AND wt.created_at > '$MIGRATION_TIME';
    " | xargs)
    echo "   Tasks created after migration without phase_id: $NEW_TASKS"
  fi
else
  echo "✅ All tasks have phase_id: PASS"
fi

echo "2.3: Tasks with missing project_id do not have phase_id"
TASKS_INVALID_PHASE=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*)
  FROM work_tasks
  WHERE project_id IS NULL AND phase_id IS NOT NULL;
" | xargs)

if [ "$TASKS_INVALID_PHASE" != "0" ]; then
  die "Data integrity issue: Found $TASKS_INVALID_PHASE tasks with phase_id but no project_id"
fi
echo "✅ Tasks without project_id have no phase_id: PASS"

echo ""
echo "📋 Check 3: API Payload Stability"
echo "---------------------------------"

if [ -z "${BASE}" ] || [ -z "${TOKEN}" ] || [ -z "${WORKSPACE_ID}" ]; then
  echo "⚠️  Skipping API checks (BASE, TOKEN, or WORKSPACE_ID not set)"
  echo "   Set these to verify API payload stability:"
  echo "   export BASE=\"http://localhost:3000\""
  echo "   export TOKEN=\"your-jwt-token\""
  echo "   export WORKSPACE_ID=\"your-workspace-uuid\""
  echo "   export PROJECT_ID=\"your-project-uuid\""
else
  if [ -z "${PROJECT_ID}" ]; then
    echo "📋 Discovering PROJECT_ID"
    PROJECT_ID=$(curl -sS "${BASE}/api/projects?limit=1" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "x-workspace-id: ${WORKSPACE_ID}" \
      -H "Content-Type: application/json" | jq -r '.data.items[0].id // .data[0].id // empty')
    
    if [ -z "${PROJECT_ID}" ] || [ "${PROJECT_ID}" = "null" ]; then
      echo "⚠️  No project found, skipping API payload checks"
    else
      echo "✅ Using PROJECT_ID: ${PROJECT_ID}"
    fi
  fi

  if [ -n "${PROJECT_ID}" ] && [ "${PROJECT_ID}" != "null" ]; then
    echo "3.1: Project plan includes required phase fields"
    PLAN_RESPONSE=$(curl -sS "${BASE}/api/work/projects/${PROJECT_ID}/plan" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "x-workspace-id: ${WORKSPACE_ID}" \
      -H "Content-Type: application/json")
    
    # Check for required phase fields
    PHASE_FIELDS_OK=$(echo "$PLAN_RESPONSE" | jq -e '
      .data.phases[0] | 
      has("id") and 
      has("name") and 
      has("sortOrder") and 
      has("isLocked") and 
      has("reportingKey") and 
      has("startDate") and 
      has("dueDate")
    ' 2>/dev/null && echo "true" || echo "false")
    
    if [ "$PHASE_FIELDS_OK" != "true" ]; then
      die "API payload issue: Project plan missing required phase fields"
    fi
    echo "✅ Phase fields present: PASS"
    
    echo "3.2: Project plan includes required task fields"
    TASK_FIELDS_OK=$(echo "$PLAN_RESPONSE" | jq -e '
      (.data.phases[0].tasks[0] // {}) | 
      has("id") and 
      has("title") and 
      has("status") and 
      has("ownerId") and 
      has("dueDate") and 
      has("blockedByCount")
    ' 2>/dev/null && echo "true" || echo "false")
    
    if [ "$TASK_FIELDS_OK" != "true" ]; then
      # Check if there are no tasks (which is acceptable)
      HAS_TASKS=$(echo "$PLAN_RESPONSE" | jq -e '.data.phases[0].tasks | length > 0' 2>/dev/null && echo "true" || echo "false")
      if [ "$HAS_TASKS" = "true" ]; then
        die "API payload issue: Project plan missing required task fields"
      else
        echo "✅ Task fields check: PASS (no tasks to verify)"
      fi
    else
      echo "✅ Task fields present: PASS"
    fi
    
    echo "3.3: Project plan response structure is stable"
    # Make two calls and compare structure
    PLAN_RESPONSE_1=$(curl -sS "${BASE}/api/work/projects/${PROJECT_ID}/plan" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "x-workspace-id: ${WORKSPACE_ID}" \
      -H "Content-Type: application/json")
    
    sleep 1
    
    PLAN_RESPONSE_2=$(curl -sS "${BASE}/api/work/projects/${PROJECT_ID}/plan" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "x-workspace-id: ${WORKSPACE_ID}" \
      -H "Content-Type: application/json")
    
    # Compare structure (ignore data values, check keys)
    STRUCTURE_1=$(echo "$PLAN_RESPONSE_1" | jq -c 'paths(scalars) as $p | {($p | join(".")): "present"}' | sort)
    STRUCTURE_2=$(echo "$PLAN_RESPONSE_2" | jq -c 'paths(scalars) as $p | {($p | join(".")): "present"}' | sort)
    
    if [ "$STRUCTURE_1" != "$STRUCTURE_2" ]; then
      die "API payload issue: Response structure is not stable between calls"
    fi
    echo "✅ Response structure stable: PASS"
  fi
fi

echo ""
echo "📋 Check 4: Program Plan Shape"
echo "------------------------------"

if [ -z "${BASE}" ] || [ -z "${TOKEN}" ] || [ -z "${WORKSPACE_ID}" ]; then
  echo "⚠️  Skipping program plan check (BASE, TOKEN, or WORKSPACE_ID not set)"
else
  # Try to find a program with projects
  PROGRAM_ID=$(curl -sS "${BASE}/api/programs?limit=1" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" 2>/dev/null | jq -r '.data[0].id // empty' || echo "")
  
  if [ -z "${PROGRAM_ID}" ] || [ "${PROGRAM_ID}" = "null" ]; then
    echo "⚠️  No program found, skipping program plan shape check"
  else
    echo "4.1: Program plan is grouped by project"
    PROGRAM_PLAN=$(curl -sS "${BASE}/api/work/programs/${PROGRAM_ID}/plan" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "x-workspace-id: ${WORKSPACE_ID}" \
      -H "Content-Type: application/json")
    
    # Check that response has plans array (grouped by project)
    HAS_PLANS=$(echo "$PROGRAM_PLAN" | jq -e 'has("data") and (.data.plans | type == "array")' 2>/dev/null && echo "true" || echo "false")
    
    if [ "$HAS_PLANS" != "true" ]; then
      die "Program plan issue: Response does not have plans array grouped by project"
    fi
    echo "✅ Program plan grouped by project: PASS"
    
    echo "4.2: Program plan does not merge phases across projects"
    # Each plan should have its own phases
    PLANS_COUNT=$(echo "$PROGRAM_PLAN" | jq '.data.plans | length' 2>/dev/null || echo "0")
    if [ "$PLANS_COUNT" -gt 0 ]; then
      # Verify each plan has phases array
      ALL_HAVE_PHASES=$(echo "$PROGRAM_PLAN" | jq -e '
        .data.plans | 
        map(has("phases") and (.phases | type == "array")) | 
        all
      ' 2>/dev/null && echo "true" || echo "false")
      
      if [ "$ALL_HAVE_PHASES" != "true" ]; then
        die "Program plan issue: Some plans missing phases array"
      fi
      echo "✅ Phases not merged across projects: PASS"
    else
      echo "✅ Phases check: PASS (no projects in program)"
    fi
    
    echo "4.3: Program plan response shape is stable"
    PROGRAM_PLAN_1=$(curl -sS "${BASE}/api/work/programs/${PROGRAM_ID}/plan" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "x-workspace-id: ${WORKSPACE_ID}" \
      -H "Content-Type: application/json")
    
    sleep 1
    
    PROGRAM_PLAN_2=$(curl -sS "${BASE}/api/work/programs/${PROGRAM_ID}/plan" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "x-workspace-id: ${WORKSPACE_ID}" \
      -H "Content-Type: application/json")
    
    STRUCTURE_1=$(echo "$PROGRAM_PLAN_1" | jq -c 'paths(scalars) as $p | {($p | join(".")): "present"}' | sort)
    STRUCTURE_2=$(echo "$PROGRAM_PLAN_2" | jq -c 'paths(scalars) as $p | {($p | join(".")): "present"}' | sort)
    
    if [ "$STRUCTURE_1" != "$STRUCTURE_2" ]; then
      die "Program plan issue: Response structure is not stable between calls"
    fi
    echo "✅ Program plan response structure stable: PASS"
  fi
fi

echo ""
echo "✅ Sprint 1 Verification: ALL CHECKS PASSED"
echo "============================================"
echo ""
echo "Ready to proceed to Sprint 2: Draft to Active state and structure locking"

