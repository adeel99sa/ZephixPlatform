# Merge Scope

date_utc: 2026-03-06T19:45:00Z
source_branch: chore/mcp-and-skills
target_branch: main
merge_commit: 3d5432c403ebd7a5b3a34b8b4003ad4a018f6fe2
merge_strategy: --no-ff (merge commit, history preserved)

---

## Commits Included (chore/mcp-and-skills ahead of main before merge)

| SHA | Message | Reason |
|-----|---------|--------|
| b9cc3c27 | docs(rbac): correct Step 0 preflight and smoke-login guard ordering nuance | Parity proof correction |
| 884b194f | chore(staging): populate staging env, add bulk-update test, gitignore playwright reports | Working tree cleanup |
| e8138247 | docs(rbac): add test parity proof and production rollout readiness | Parity assessment |
| 36449328 | chore(rbac-v2): add enterprise CI guards for role-drift, import-drift, and deployment trust | CI guard additions |
| d41b845a | refactor(rbac): centralize role resolution and normalize workspace role compatibility | RBAC V2 cleanup |
| df3734a4 | chore(smoke): prevent token leaks and enforce contract-runner parity | Smoke governance |
| 593b3eb7 | chore(staging): rollup schema parity proof + strict contract | Schema parity fix |
| 218f07b8 | fix(migrations): create risks table for portfolio rollup schema parity | Migration fix |
| e9380ad4 | fix(migrations): add phase3 migration for conflict lifecycle columns | Migration fix |
| 2f573e42 | fix(migrations): use db:migrate in nixpacks start cmd | Deploy fix |
| c665f46d | fix(schema): run migration:run on container boot | Deploy fix |
| 49323416 | chore(hardening): guard consolidation, schema-blocking readiness | Hardening |
| + 44 earlier commits | (staging setup, deploy hardening, auth, frontend, etc.) | Platform history |

---

## Commits on origin/main NOT in chore/mcp-and-skills (3 commits)

These 3 commits were added directly to main and are older/earlier versions of
changes that chore/mcp-and-skills also includes (same feature, different SHAs):

| SHA | Message | Conflict type | Resolution |
|-----|---------|---------------|------------|
| 130b6eff | chore(smoke): switch onboarding smoke to smoke login flow | add/add in staging-onboarding.sh | Took chore/mcp-and-skills (newer, hardened) |
| 49cb53d9 | feat(auth): staging smoke login endpoint behind smoke key | add/add in smoke-key.guard.ts, smoke-key.guard.spec.ts; content in auth.controller.ts | Took chore/mcp-and-skills (BadRequestException, NotFoundException behavior) |
| 9ee58932 | chore(ci): replace staging smoke secrets with smoke key | add/add in staging-smoke-lane.yml, staging.env | Took chore/mcp-and-skills (full RBAC guard suite, real values) |

All 6 conflict resolutions took the chore/mcp-and-skills version. Justification:
chore/mcp-and-skills is the superset — it includes the same features as the 3 main
commits but with RBAC V2 improvements on top (NotFoundException vs ForbiddenException,
getZephixEnv vs isStagingRuntime, extended spec coverage, RBAC guard CI jobs).

---

## Commits Excluded

None. All commits on chore/mcp-and-skills were included in the merge.
The 3 commits on origin/main were superseded by the merge-conflict resolution
(chore/mcp-and-skills version taken).
