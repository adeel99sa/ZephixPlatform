Cursor Runbook Template

Purpose
Use this template for any change in Zephix. It enforces lane execution, minimal diffs, and proof outputs.

Inputs

Goal

Constraints

Target files

Validation commands

Step 0. Pick the skill
Pick exactly one primary skill folder name from .cursor/skills.
State why it applies in one sentence.

Step 1. Pre flight evidence
Run and paste outputs

git rev-parse --abbrev-ref HEAD

git status --short

git diff --name-only

Step 2. Locate the truth in repo

Find existing modules first

List exact file paths to touch

Confirm route prefixes and required headers when relevant

Step 3. Plan lanes
Lane 0. Harness and docs only
Lane 1. Tests and gates
Lane 2. Backend route contract fixes
Lane 3. Frontend wiring
Pick the smallest lane set required.

Step 4. Execute
For each step

Command

First 60 lines of output
Stop on first failure.

Step 5. Validate
Run the smallest relevant checks first, then gates.

backend targeted jest if backend touched

frontend build if frontend touched

npm run test:gating when relevant

Step 6. Proof and diff
Paste

git diff --name-only

git status --short

short summary of what changed and why

## Builder UX Acceptance (required for any builder/configurator/editor PR)

If this change touches any user-facing builder, configurator, editor, wizard, 
or form, the developer must self-check the following BEFORE requesting review.
If the change does not involve a builder, write "N/A — not a builder change."

- [ ] 30-second test passes (non-technical user produces working result in <30s with AI, <2min without)
- [ ] No fully-empty default state shown to user
- [ ] No more than 7 visible options at any decision point
- [ ] Live preview is present and updates as user configures
- [ ] "Ask AI to help" is a visible primary action on the builder
- [ ] At least 3 pre-built recipes shipped with the builder
- [ ] Undo works for any user action in the builder
- [ ] Reference: .cursor/rules/40-zephix-builder-ux.mdc

PRs that fail any of the above must NOT request review until fixed.

Step 7. Commit
Commit message format
type(scope): summary
