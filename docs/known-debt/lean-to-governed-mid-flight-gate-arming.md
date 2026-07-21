# LEAN → GOVERNED mode switch does not retro-arm gates on existing projects

**Status:** known debt (parked lifecycle question) · **Surfaced by:** GATE-MODE-COHERENCE-1 (2026-07-20) · **Due:** with the mid-flight-life-cycle-change decision (2026-08-01 batch)

## The interaction

GATE-MODE-COHERENCE-1 made gate **arming** mode-aware at **instantiation only** (read
once, no runtime mode check): LEAN projects get their phases and structure but **no
armed gate definitions**; STANDARD/GOVERNED arm as before.

Consequence: a workspace that instantiates projects while **LEAN**, then later switches
to **GOVERNED**, will have **existing projects with no armed gates** — because arming
happened (or didn't) at instantiate time, and nothing re-arms retroactively. New projects
created after the switch arm correctly. The workspace's policy console will read the gate
policies as ENFORCING (GOVERNED default), while its pre-switch projects carry no gates —
a per-project vs workspace-mode divergence.

This is the **same class** as the already-parked mid-flight life-cycle question (flipping
a live workspace's mode changes `isPolicyActive`/bundle defaults and would arm gates under
running work — see the complexity-default=STANDARD note: *existing workspaces are NOT
backfilled*, deliberately). Arming-at-instantiate makes that boundary explicit rather than
worse: it never silently arms a gate under a project that is already in flight.

## Do NOT build retro-arming here

Retro-arming existing LEAN projects on a GOVERNED switch is a lifecycle decision, not a
bug fix:
- It would arm gates under work that is already mid-phase (the exact "armed gates under
  running work" hazard).
- It needs a product ruling on whether a mode switch is retroactive, prospective, or
  requires per-project opt-in — and on what happens to phases already past their gate.

Parked with the other dated mid-flight items. When that decision lands, the options are:
(a) prospective-only (current behaviour — document it in-product), (b) a bounded
re-arm pass gated on project state (only phases not yet started), or (c) per-project
"adopt governance" action. No code here until then.
