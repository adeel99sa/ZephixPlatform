# Probe/test artifacts in shared fixture workspaces can only be removed by direct DB access

**Status:** known debt (fixture hygiene) · **Surfaced by:** GOV-BUILD Wave1 surface-3 verification (2026-07-20) · **Priority:** low

Change requests have create / submit / approve / reject / implement endpoints but
**no DELETE**. A CR created for a live proof therefore cannot be removed through the
API — only by a direct DB delete. This is the **second** time this program has left an
undeletable probe row in a shared fixture workspace (prior: the GovProofFinal ownership
divergence, where fixture rows were indistinguishable from real ones and cost a recon
round trip).

**The pattern (the actual debt):** any entity used in a live proof that has no delete
path leaves residue in a shared workspace. Mitigation in use = title the artifact
`… DELETE-ME` so a later recon doesn't read it as real data. That is a convention, not a
guarantee.

**Current residue (both titled DELETE-ME):**
- CR `3337fbe6-3a93-441f-9862-f6cfd2f62da0` — feb22424 (Cloud Team Test, STANDARD), status APPROVED (surface-3 Assertion 1).
- CR `35123d5c-3a11-4ca0-a04b-b99fafc5f787` — 84d46f51 (GovProofFinal, GOVERNED), status SUBMITTED (GOVERNED-403 discriminator; approve was correctly blocked).

**Not fixing now.** Options when it's worth addressing: a soft-delete/void endpoint for
CRs, or a dedicated disposable proof workspace so probe residue never lands in a CI
fixture. Until then, prefer a throwaway workspace for live mutations over a KEEP fixture.
