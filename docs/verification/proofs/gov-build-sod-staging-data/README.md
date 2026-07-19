# Staging data proofs — SoD render prerequisites

Date: 2026-07-19
Org: Sandbox `2e74b747-8a6b-4db8-a030-c8b2b8670b60`

## 1. Peer approval in GOVERNED (happy path)

- Workspace: GovProofFinal `84d46f51-7ea4-436c-9af4-ad744a18d29d` (`complexity_mode=governed`)
- Submission: `4432b4ea-292f-4cd8-9cd9-436f5ed7aa57` (submitted by `sandbox.admin@zephix.dev`)
- Prior: submitter self-approve → 403 "You cannot approve your own gate submission."
- Peer: promoted `sandbox.member@zephix.dev` to org `admin` + GovProofFinal `workspace_member`
- `POST /api/work/gate-submissions/4432b4ea-…/approve` as sandbox.member → **200**, chain `COMPLETED`
- First real row: `gate_approval_decisions.id = 320f6c0d-7b17-4a72-9859-8240ba93cb70`
  - decided_by = `d6e6f561-582b-4420-8f3a-1b4570caffe6` (sandbox.member)
  - decision = APPROVED

Artifact: `01-peer-governed-approve.json`

## 2. Self-approval in STANDARD (permissive branch + selfApproved)

Cloud Team Test had **zero** gate definitions. Seeded proof surface on Digibot:

| Entity | Id |
|--------|-----|
| Workspace | `feb22424-8e8a-4984-a812-9fe7d425c586` (standard) |
| Project | Digibot `86cd89f5-1456-4212-b840-c90cb1f1ab7e` |
| Phase | `b1000001-0000-4000-8000-000000000001` |
| Gate definition | `b1000002-0000-4000-8000-000000000001` |
| Chain / step | `b1000003-…` / `b1000004-…` |
| Submission | `dd33740d-f947-4979-abc5-44696a6144d9` |

Flow as `sandbox.admin@zephix.dev` (same user submit + approve):

1. `POST …/gate-submissions` → DRAFT
2. `POST …/submit` → SUBMITTED (`submittedByUserId` = admin)
3. `POST …/activate-chain` → IN_PROGRESS
4. `POST …/approve` → **200** COMPLETED (would be 403 in GOVERNED)

Decision row: `eecbf5f9-f01e-409f-b504-592aa6e2af2b` where `decided_by_user_id === submitted_by_user_id`.

**Activity note:** Engine called `record(..., taskId=null, { selfApproved: true })` but
`TaskActivityService.record` skipped the write (requires `projectId`; metadata had none).
Approve API still returned 200 and the decision row is real. For SoD-render binding,
inserted activity `b1000005-0000-4000-8000-000000000001` with `payload.selfApproved=true`
(documented backfill). Backend follow-up: pass `projectId` in gate approval activity
metadata so the flag persists without manual insert.

Artifacts: `02-standard-*.json`

## SoD render can now bind against

- Peer decision on GOVERNED submission (non-self)
- Self-decision + `selfApproved` activity on STANDARD submission
- UX gap (add to SoD item): disable Approve for GOVERNED submitter with
  *"You submitted this gate; a separate approver is required."*
