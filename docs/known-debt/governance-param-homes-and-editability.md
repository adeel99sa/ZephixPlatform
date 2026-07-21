# Governance threshold params live in three different homes

**Status:** known debt · **Owner lane:** GOV-UNIFY-1 · **Surfaced by:** GOV-BUILD WAVE-1 Unit 6 (2026-07-19)

## The finding

The platform has **three separate policy/param stores**, and the three tunable
governance thresholds each live in a different one:

| Threshold | Constant | Home | Read at decision time? |
|---|---|---|---|
| Max active tasks (capacity) | `DEFAULT_MAX_ACTIVE_TASKS = 15` | **W2** `workspace_policies.params` (`resource-capacity-governance.max_active_tasks`) | Yes — `CapacityGovernanceService` (Unit 6) |
| Budget change threshold | `DEFAULT_CHANGE_THRESHOLD_PERCENT = 20` | **hardcoded constant** in `BudgetGovernanceService` — no W2 code (only the *retired* classic `budget-threshold`) | No |
| Acceptance-criteria min count | `?? 2` | **`PoliciesService`** key-value store (`policy_definitions` / `policy_overrides`) | Yes, already — but no admin write path, no declared schema |

This is the same class of fragmentation as the six role vocabularies and the
three decision vocabularies already tracked in
[complexity-mode-taxonomy-and-sod-claim.md](./complexity-mode-taxonomy-and-sod-claim.md).

### Why Unit 6 did not unify them

Unit 6 wired **only** the capacity threshold onto `workspace_policies.params`
(the W2 store the admin sentence view already renders), because that is the one
threshold whose policy code exists in the W2 catalog. Bridging `PoliciesService`
and the hardcoded budget constant into the W2 view is a two-system merge — it
belongs to **GOV-UNIFY-1**, which already owns the two-brain fork and its
constraints (SoD ordering, SKIPPED receipts, definition snapshot, change
control). Doing a partial merge inside Unit 6 would fork that work across two
dispatches and expand a cross-lane contract mid-build.

**Consequence for product copy:** the one-pager says "adjust the thresholds."
After Unit 6 that is true for the *capacity* threshold's plumbing only, and even
that is not user-editable yet (see below). Budget and acceptance-criteria are
not adjustable via the policy console. Copy should say "adjust thresholds where
they apply."

## `editable` (param-readability) vs `state` (gate-evaluability) are distinct — deliberately not exposed

Two orthogonal concepts:

- **param-readability** — does a live evaluator read this number at decision time?
  (`PolicyParamMeta.readAtDecisionTime`)
- **gate-evaluability** — can the policy actually act, i.e. is its input engine
  present? (`isPolicyEvaluable(code)` / `NON_EVALUABLE_POLICY_CODES`)

`resource-capacity-governance` is the case where they diverge: the advisory
`CapacityGovernanceService` reads `max_active_tasks` live, yet the code is
`NON_EVALUABLE` (the E7 gate-injection path is not built). Technically the number
*is* read; but as a **policy gate** it cannot act.

**Ruling (GOV-BUILD, 2026-07-19):** we keep `state` and `editable` **aligned**
and do not expose the split to users. The admin contract computes
`editable = isPolicyEvaluable(code) && readAtDecisionTime`. So a `NOT_EVALUABLE`
policy always renders `editable: false`, even when a service happens to read the
value. Showing an editable number chip on a card that reads *"Risk engine not
enabled"* would be the phantom-capability pattern (same family as the hardcoded
`hardBlocksThisWeek`, the unvalidated `permissions_config` write, and the
`validatePermissionsConfig` validator defined-and-never-called): a control that
implies an effect the system does not deliver.

The distinction is recorded here so it is not re-litigated; if a future case
genuinely needs to expose param-readability independently of gate-evaluability,
the reasoning is already on record. Invariant enforced by test:
`state === 'NOT_EVALUABLE'` ⇒ every param has `editable: false`.

`max_active_tasks`'s `editable` flips to `true` automatically once
`resource-capacity-governance` becomes evaluable (E7 ships) — no retrofit; the
plumbing already reads the param.
