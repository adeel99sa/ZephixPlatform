# External research log — Frontend engine documentation (WS-DOC-FE-ENGINES)

**Purpose:** Traceable evidence and URL index supporting engine/foundation documentation—especially **competitive** §X.5.2 tables (public vendor documentation).

**Relationship to §X.5:** Engine and foundation docs now frame §1.5 / §6.5 / §F-E.5 as **practitioner discipline + positioning + differentiation**. This log **does not drive** those sections; it **supports** them with dated URLs and short paraphrases. Synthesis in §X.5.1 / §X.5.3 is intentionally **not** a bibliography.

**Sanitization:** No customer data; quotes are brief and attributed; URLs are public documentation only.  
**Accessed:** Unless noted, sources were reviewed on **2026-05-07**.

---

## How to use this log

Each row summarizes **what was read** and **how Zephix aligns or diverges**. Detailed **positioning** appears in:

- [engine-1-rbac.md](../engines/engine-1-rbac.md) §1.5  
- [engine-6-dashboards-kpis.md](../engines/engine-6-dashboards-kpis.md) §6.5  
- [f-e-admin-console.md](../foundations/f-e-admin-console.md) §F-E.5  

---

## Engine 1 — Identity & Access / RBAC comparisons

| # | Source | URL | Insight (paraphrased) | Zephix alignment |
|---|--------|-----|----------------------|----------------|
| E1-1 | GitHub Docs — *Roles in an organization* | https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/roles-in-an-organization | Organizations combine **org-level**, **team**, and **repository** roles; custom roles bundle granular permissions on Enterprise. | Layered RBAC matches Zephix platform vs workspace vs project semantics. |
| E1-2 | Linear Docs — *Members and roles* | https://linear.app/docs/members-roles | Workspace **Owner / Admin / Member / Guest** tiers; Enterprise owners control exports & audit; guests scoped to invited teams. | Parallel to platform + workspace viewer patterns; Zephix adds explicit legacy string normalization. |
| E1-3 | Atlassian Support — *Admin roles* | https://support.atlassian.com/user-management/docs/what-are-the-different-types-of-admin-roles/ | Splits **Organization admin**, **Site admin**, **User access admin**, **App admin** with overlapping duties. | Validates enterprise expectation of multiple admin planes; Zephix simplifies IA while retaining enforcement depth server-side. |
| E1-4 | Stripe Docs — *Manage access to your organization* | https://docs.stripe.com/get-started/account/orgs/team | Stripe **organizations** combine account-level and org-level roles for dashboard administration. | Useful analogy for billing + org administration coupling; Zephix RBAC remains independent of Stripe dashboard roles. |
| E1-5 | Asana Help — *Admin Console / permissions* | https://www.asana.com/features/admin-security/admin-console | Centralized admin hub for org-wide security settings and guest controls on paid tiers. | Confirms B2B expectation of converged admin UX; Zephix follows quieter IA per product principles. |

**Representative attributed snippets (short):**

- **GitHub:** Documentation describes predefined organization roles including owners with full administrative access and optional custom roles for granular permissions.  
- **Linear:** Documentation lists workspace roles (Owner, Admin, Member, Guest) and notes Enterprise-only capabilities such as exports and audit logs for workspace owners.  

---

## Engine 6 — Dashboards, KPIs & analytics governance

| # | Source | URL | Insight (paraphrased) | Zephix alignment |
|---|--------|-----|----------------------|----------------|
| E6-1 | Datadog — *RBAC / permissions* | https://docs.datadoghq.com/account_management/rbac/permissions/ | Permissions aggregate into roles; dashboard interactions depend on assigned roles and evolving restriction policies. | Mirrors need for viewer vs editor dashboard semantics in Zephix widgets. |
| E6-2 | Datadog — *Restriction policies API* | https://docs.datadoghq.com/api/latest/restriction-policies/ | Fine-grained **viewer/editor** relations can bind to dashboards as resources. | Informs future Zephix policy-style dashboard ACLs beyond coarse RBAC. |
| E6-3 | New Relic — *User permissions* | https://docs.newrelic.com/docs/accounts/accounts-billing/new-relic-one-user-management/user-permissions | Permissions are granular tasks grouped into custom roles at org/account scope. | Supports Zephix direction of explicit calculator/API permissions on KPI routes. |
| E6-4 | New Relic — *Dashboards prerequisites* | https://docs.newrelic.com/docs/query-your-data/explore-query-data/dashboards/prerequisites-to-share-dashboards-charts/ | Sharing dashboards externally requires explicit permission bundles (live URL scopes). | Highlights parity gap: Zephix must document share/embed policies before exposing public links. |
| E6-5 | Tableau — *Governance blueprint* | https://help.tableau.com/current/blueprint/en-gb/bp_governance_in_tableau.htm | Governance ensures trusted data and controlled publishing pathways across workbooks and dashboards. | Aligns with Zephix governed methodology though BI depth differs. |
| E6-6 | Google Cloud — *Looker access control* | https://cloud.google.com/looker/docs/access-control-and-permission-management | Separates **content**, **data**, and **feature** permissions; encourages groups + embed secrets for multi-tenant embed. | Informs optional future embedded BI strategy; current dashboards remain first-party React. |

---

## Foundation F-E — Admin console patterns

| # | Source | URL | Insight (paraphrased) | Zephix alignment |
|---|--------|-----|----------------------|----------------|
| FE-1 | ClickUp Help — *Permissions in detail* | https://help.clickup.com/hc/en-us/articles/6309221065495-Permissions-in-detail | Permissions inherit down workspace hierarchy (Spaces → Lists → Tasks). | Comparable hierarchical permission UX; Zephix workspace/project structure differs but inherits same mental model. |
| FE-2 | ClickUp Help — *Owner / Admin / Member roles* | https://help.clickup.com/hc/en-us/articles/25710132309655-Owner-admin-and-member-type-user-roles | Admins manage billing, permissions, integrations; owners may tailor admin capabilities on Enterprise tiers. | Reinforces Engine 1 helper separation between owner-class and admin-class powers. |
| FE-3–FE-5 | Linear, Asana, Atlassian entries above | (see E1-2, E1-3, E1-5) | Admin consoles combine identity, billing, and security policies. | Cross-applied in F-E §F-E.5 narrative. |

---

## Academic / pattern literature (ADR discipline)

| # | Source | URL | Insight |
|---|--------|-----|---------|
| P-1 | Michael Nygard via Cognitect | https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions | ADRs capture **status, context, decision, consequences** to make reversals explicit. |
| P-2 | ADR templates index | https://adr.github.io/adr-templates/ | Community-maintained templates interoperate with tooling (`adr-tools`). |

---

## Architectural observations (evaluation cycle)

1. **Layered RBAC** (GitHub, Linear, Atlassian) is table stakes for B2B PM/EAA tools — Zephix differentiates via **normalized legacy strings + ESLint Rule A**, not via novel_role_taxonomy.  
2. **Operational dashboards** (Datadog/New Relic) emphasize **resource-level ACL evolution** — Zephix should plan **WS-AF-DASHBOARD-CONSOLIDATION** before copying BI-grade policies blindly.  
3. **Admin consoles** converge on org-wide security controls — Zephix intentionally avoids marketing governance loudly in-product (capabilities operate quietly unless blocking or configuring).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-07 | Initial research entries for WS-DOC-FE-ENGINES Step 2. |
| 2026-05-08 | Reframe note: §X.5 positioning vs bibliography (WS-DOC-FE-ENGINES-REFRAME). |
