# Staging-only marketing landing (pre-MVP)

The anonymous, problem-first landing page lives in the frontend under
`zephix-frontend/src/pages/staging/StagingMarketingLandingPage.tsx` and related
components in `zephix-frontend/src/components/staging-marketing/`.

## When it shows

Guests hitting `/` see this page **only** when the build-time flag is enabled:

| Variable | Values that enable |
|----------|--------------------|
| `VITE_STAGING_MARKETING_LANDING` | `true` or `1` |
| `VITE_FLAGS` | includes `stagingMarketingLanding` (comma-separated) |

**Production** must leave `VITE_STAGING_MARKETING_LANDING` unset or `false` so
guests keep the default `LandingPage`.

**Staging (e.g. Railway)** set:

```bash
VITE_STAGING_MARKETING_LANDING=true
```

Rebuild/redeploy the frontend after changing env vars (Vite bakes `VITE_*` at build time).

## Local preview

```bash
cd zephix-frontend
VITE_STAGING_MARKETING_LANDING=true npm run dev
```

Open `http://localhost:5173/` while logged out.

## Roadmap copy (honest timeline)

The staging landing reflects a **Q2 2026 private beta** target, **Q1 2026 final development** through March 31, and **Q3 GA** for self-serve and published pricing. Update section copy in `StagingRoadmapSections.tsx` when dates or scope change—keep claims aligned with `STAGING_MARKETING_LANDING` technical checklist.

---

## Technical verification checklist (architect)

Use this before treating any marketing claim as committed. Copy status into your gate report.

### 1. Resource intelligence

- [ ] Admin can set threshold range (e.g. 80–100% base)?
- [ ] System flags 100–110% differently than 110%+?
- [ ] Notes/justification field for overrides?
- [ ] Admin can configure approval notification email?
- [ ] Approval requirement toggle per workspace?
- [ ] Screenshot: resource heatmap UI at ~120% with warning

### 2. Architecture & hierarchy

- [ ] Projects matrix across workspaces (as designed)?
- [ ] Workspace owners run projects / assign members?
- [ ] Data strictly organization-scoped (no cross-tenant leakage)?
- [ ] Diagram: Org → Workspace → Project → tasks

### 3. Template system

- [ ] Templates mandatory for project creation?
- [ ] Projects without template possible?
- [ ] Template automations togglable?
- [ ] List six launch templates (names + descriptions) vs product reality
- [ ] Screenshot: Template Center with 3+ templates

### 4. AI capabilities (today vs planned)

- [ ] Create tasks? (Y/N)
- [ ] Change statuses? (Y/N)
- [ ] Create workspaces? (Y/N)
- [ ] Role-based context (PM vs exec)? (Y/N)
- [ ] Location-aware help? (Y/N)
- [ ] Agentic / automated reports? (Y/N)
- [ ] Short demo: contextual help or task assist

### 5. Project overview

- [ ] First project view is Overview?
- [ ] Scope summary, teams, meeting details?
- [ ] Tabs: activities, docs, risk, lessons learned (as applicable)
- [ ] Screenshot: project overview (not board only)

### 6. Import

- [ ] CSV/Excel import today? (Y/N)
- [ ] Field mapping list
- [ ] Demo: import + conflict signal

### 7. Security & compliance

- [ ] SOC 2 Type II: in progress / complete / not started
- [ ] GDPR stance
- [ ] Encryption at rest / in transit
- [ ] Full export? (Y/N)
- [ ] Account delete / retention policy

### 8. Pricing

- [ ] $20 / $35 confirmed planned?
- [ ] Free tier: 3 users, 2 workspaces — hard vs soft limits
- [ ] Behavior at user #4

### 9. Beta

- [ ] Real count for “50 founding organizations” (or reword)
- [ ] End-to-end usable today?
- [ ] Signup: immediate vs waitlist

### 10. Performance

- [ ] Dashboard load target (<2s?)
- [ ] Resource heatmap at N projects (e.g. 50) latency
- [ ] Uptime / SLO target
