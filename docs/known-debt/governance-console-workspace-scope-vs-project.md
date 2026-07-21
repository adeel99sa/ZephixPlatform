# Policy console is workspace-scoped; a gate policy reads ENFORCING even for a project whose template armed no gates

**Status:** known debt (honest residue of GATE-MODE-COHERENCE-1) · **Surfaced:** 2026-07-20 · **Due:** whenever project-level governance display is built

## The imprecision

After GATE-MODE-COHERENCE-1, `GET /admin/governance/policies?workspaceId=…` resolves gate
policies to `ENFORCING` / `BLOCK` for the workspace's mode (STANDARD/GOVERNED). The endpoint
is **workspace-scoped** — it has no `projectId` and cannot know whether a *specific* project's
template armed gates.

Consequence: a **Scrum/Kanban/Simple** project (no `gateKey`s → no armed gates) living in a
**STANDARD** workspace still makes the console read the five transition-gate policies as
`ENFORCING`. That is not *wrong* — the workspace default **is** enforcing, and a gated template
in that workspace **does** block — but it is imprecise for that particular gate-less project.

## Why it's acceptable now, and the fix when it isn't

The current contract is workspace-level: "in this mode, gated projects' gates block." That is a
truthful statement about the workspace. The imprecision only bites if/when someone builds a
**project-level** governance view — at which point that view must resolve state from the
project's actual **armed gate definitions** (`phase_gate_definitions` for the project), not from
the workspace mode + bundle. No code until then; this is a display concern, not an enforcement
one (enforcement already keys off armed gate-defs via `isPhaseGateBlocking`).

Filed alongside the other governance-display coherence items
([[complexity-mode-taxonomy-and-sod-claim]], [[lean-to-governed-mid-flight-gate-arming]]).
