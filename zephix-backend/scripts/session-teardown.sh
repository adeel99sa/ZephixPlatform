#!/usr/bin/env bash
#
# session-teardown.sh — SESSION-PROVISION-1 (teardown half)
# Remove the tester orgs that session-provision.sh created on STAGING.
#
# ⚠️ THERE IS NO ORG-DELETE ENDPOINT. Verified: the organizations table has no
#    deleted_at / soft-delete, and no controller exposes DELETE /organizations/:id
#    (only remove-user-from-org and delete-invitation/member). Staging already
#    carries 238 orgs and 221 test accounts — do not add five more permanently,
#    but also do NOT let a script fire a blind cross-table DELETE against a shared
#    database.
#
# So this script does NOT delete anything itself. It:
#   1. (read-only) PREVIEWS exactly which orgs match <PREFIX>-NN and their blast
#      radius (workspaces / projects / tasks / memberships), via a scoped SELECT.
#   2. GENERATES a reviewed, prefix-scoped teardown .sql the operator runs THEM-
#      SELVES in psql — with the COMMIT commented out so nothing commits until a
#      human uncomments it.
#
# --dry-run defaults to TRUE: with dry-run it prints the preview + the path to
#   the generated SQL and does not even connect to the DB unless you pass a DB
#   command. Nothing is ever destructively executed by this script.
#
set -uo pipefail

PREFIX="SESSION"
COUNT=5
DRY_RUN=true
OUT_SQL=""
# Read-only preview uses the same wrapper the runbook documents. Left empty by
# default so the script prints the SELECT for the operator rather than running it.
PSQL_WRAPPER=""   # e.g. 'railway run -s Postgres -e staging -- bash -c'

usage() {
  cat <<USAGE
session-teardown.sh — generate a scoped, reviewed teardown for tester orgs

  --prefix <str>      default SESSION   (matches orgs named <PREFIX>-%)
  --count <n>         default 5         (informational; matching is by prefix)
  --out-sql <path>    default session-teardown-<PREFIX>-<date>.sql
  --psql-wrapper <c>  OPTIONAL read-only preview runner, e.g.:
                      'railway run -s Postgres -e staging -- bash -c'
                      When set, the script runs ONLY the read-only SELECT preview.
  --no-dry-run        acknowledged, but this script NEVER deletes — it always
                      emits SQL for you to review and run. --no-dry-run only
                      means "also run the read-only preview if a wrapper is set".
  -h|--help
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --prefix) PREFIX="$2"; shift 2;;
    --count) COUNT="$2"; shift 2;;
    --out-sql) OUT_SQL="$2"; shift 2;;
    --psql-wrapper) PSQL_WRAPPER="$2"; shift 2;;
    --no-dry-run) DRY_RUN=false; shift;;
    -h|--help) usage; exit 0;;
    *) echo "unknown arg: $1" >&2; usage; exit 2;;
  esac
done

[ -n "$OUT_SQL" ] || OUT_SQL="session-teardown-${PREFIX}-$(date +%Y%m%d-%H%M%S).sql"
LIKE="${PREFIX}-%"

# ── the read-only preview (safe to run anywhere) ─────────────────────────────
PREVIEW_SQL="SELECT o.id, o.name,
       (SELECT count(*) FROM workspaces w WHERE w.organization_id = o.id)  AS workspaces,
       (SELECT count(*) FROM projects  p JOIN workspaces w ON w.id = p.workspace_id WHERE w.organization_id = o.id) AS projects,
       (SELECT count(*) FROM users     u WHERE u.organization_id = o.id)   AS users_primary_here
  FROM organizations o
 WHERE o.name LIKE '${LIKE}'
 ORDER BY o.name;"

# ── generate the reviewed teardown SQL ───────────────────────────────────────
cat > "$OUT_SQL" <<SQL
-- session-teardown-${PREFIX} — generated $(date -u +%Y-%m-%dT%H:%M:%SZ)
-- Scope: ONLY organizations named '${LIKE}' (the ones session-provision created).
-- REVIEW EVERY LINE. This is a shared staging DB (238+ orgs). The COMMIT is
-- commented out on purpose — nothing commits until a human uncomments it.
--
-- OPTION A (RECOMMENDED, reversible): soft-disable, don't destroy.
--   Sets status so the orgs drop out of active views without a cross-table delete.
-- BEGIN;
--   UPDATE organizations SET status = 'inactive'
--    WHERE name LIKE '${LIKE}' AND status IN ('active','trial');
--   -- verify the row count matches your preview, THEN:
-- -- COMMIT;
-- ROLLBACK;  -- default: change nothing until you have reviewed

-- OPTION B (THOROUGH, destructive): hard delete in FK order, scoped by prefix.
--   Only if you truly want them gone. Deletes children before parents. Verify
--   each SELECT count before uncommenting the DELETEs. Add tables if the schema
--   has grown since this was generated.
-- BEGIN;
--   WITH orgs AS (SELECT id FROM organizations WHERE name LIKE '${LIKE}'),
--        ws   AS (SELECT id FROM workspaces WHERE organization_id IN (SELECT id FROM orgs)),
--        proj AS (SELECT id FROM projects   WHERE workspace_id   IN (SELECT id FROM ws))
--   -- children first:
--   DELETE FROM phase_gate_approval_decisions WHERE submission_id IN (SELECT id FROM phase_gate_submissions WHERE gate_definition_id IN (SELECT id FROM phase_gate_definitions WHERE project_id IN (SELECT id FROM proj)));
--   DELETE FROM phase_gate_submissions        WHERE gate_definition_id IN (SELECT id FROM phase_gate_definitions WHERE project_id IN (SELECT id FROM proj));
--   DELETE FROM gate_approval_chain_steps     WHERE chain_id IN (SELECT id FROM gate_approval_chains WHERE gate_definition_id IN (SELECT id FROM phase_gate_definitions WHERE project_id IN (SELECT id FROM proj)));
--   DELETE FROM gate_approval_chains          WHERE gate_definition_id IN (SELECT id FROM phase_gate_definitions WHERE project_id IN (SELECT id FROM proj));
--   DELETE FROM phase_gate_definitions        WHERE project_id IN (SELECT id FROM proj);
--   DELETE FROM work_tasks                    WHERE project_id IN (SELECT id FROM proj);
--   DELETE FROM work_phases                   WHERE project_id IN (SELECT id FROM proj);
--   DELETE FROM projects                      WHERE workspace_id IN (SELECT id FROM ws);
--   DELETE FROM workspace_policies            WHERE workspace_id IN (SELECT id FROM ws);
--   DELETE FROM workspace_members             WHERE workspace_id IN (SELECT id FROM ws);
--   DELETE FROM workspaces                    WHERE organization_id IN (SELECT id FROM (SELECT id FROM organizations WHERE name LIKE '${LIKE}') o);
--   DELETE FROM user_organizations            WHERE organization_id IN (SELECT id FROM organizations WHERE name LIKE '${LIKE}');
--   -- NOTE: users whose PRIMARY org is one of these are left in place (a user
--   -- may belong to other orgs; deleting users is out of scope for teardown).
--   DELETE FROM organizations                 WHERE name LIKE '${LIKE}';
-- -- COMMIT;
-- ROLLBACK;
SQL

echo "Read-only preview SQL (run this first to see the blast radius):"
echo "---------------------------------------------------------------"
echo "$PREVIEW_SQL"
echo ""
echo "Generated reviewed teardown SQL → $OUT_SQL"
echo "  Option A (recommended): soft-disable (status='inactive'), reversible."
echo "  Option B: hard delete in FK order. Both COMMIT-commented; nothing runs"
echo "  until you review and uncomment in psql."
echo ""
echo "To run the preview via the documented wrapper (read-only):"
echo "  railway run -s Postgres -e staging -- bash -c 'psql \"\$DATABASE_PUBLIC_URL\" -c \"<preview SQL>\"'"
echo ""

if ! $DRY_RUN && [ -n "$PSQL_WRAPPER" ]; then
  echo "=== running READ-ONLY preview via wrapper ==="
  $PSQL_WRAPPER "psql \"\$DATABASE_PUBLIC_URL\" -c \"$PREVIEW_SQL\""
fi

echo ""
echo "This script NEVER deletes. Removal is a manual, reviewed psql step (above)."
