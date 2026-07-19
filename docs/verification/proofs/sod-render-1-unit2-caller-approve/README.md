# SOD-RENDER-1 Unit 2 — staging affordance proof

Date: 2026-07-19
Submission: `57411161-4dc0-48cc-b3ca-79f1c5b9a278` (GOVERNED GovProofFinal)
Chain: IN_PROGRESS / activeStep `55f76c10-3884-4562-b6e3-c68b459d212d`

## Submitter (`sandbox.admin@zephix.dev`)
- `callerCanApprove`: **false**
- `callerCannotApproveReason`: `SELF_APPROVAL_NOT_PERMITTED`
- UI copy: *You submitted this gate; a separate approver is required.*
- Artifact: `approval-state-admin.json`

## Eligible peer (`sandbox.member@zephix.dev`, org admin + workspace member)
- `callerCanApprove`: **true**
- `callerCannotApproveReason`: null
- Approve stays enabled
- Artifact: `approval-state-peer.json`

## Guardrails verified
- Payload uses **`callerCanApprove` / `callerCannotApproveReason`** (GATE-API-2 / #473).
- Evaluator `canApprove` is **not** present / not used (collision avoided).
