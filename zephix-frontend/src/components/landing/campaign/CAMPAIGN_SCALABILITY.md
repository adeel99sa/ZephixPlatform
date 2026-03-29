# Campaign scalability guardrail (Zephix marketing)

Before adding a new campaign route or surface:

1. **Problem wedge** — The page must map to a specific buyer problem (not a generic feature tour).
2. **Governance bridge** — The narrative must tie back to governed execution (engines, gates, auditability), not only tooling or reporting.
3. **Naming** — URL slug and `campaign` query value use **kebab-case** (e.g. `resource-risk`). React components may use PascalCase `ResourceRisk*` for that campaign’s folder; do not introduce alternate slugs like `risk-resource` for the same campaign.
4. **Attribution** — Primary CTA goes to `/demo?campaign=<slug>`; the demo API stores `campaignSlug` and optional `leadIntent` server-side.

Do **not** add generic “feature pages” or tool-only positioning that could be mistaken for a standalone risk or task tracker without governance context.
