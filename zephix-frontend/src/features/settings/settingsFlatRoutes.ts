/**
 * Placeholder-only slugs under `/settings/*` (each maps to `PlaceholderPage` in `App.tsx`).
 *
 * **Implemented settings pages** (real components, not in this array): `general`,
 * `security-sso`, `billing`, `members`, `teams`, `policy-engine`,
 * `template-enforcement`, `capacity-rules`, `exception-workflows`, `audit-logs`,
 * `custom-fields`, `status-workflows`, `risk-matrix`, `integrations`,
 * `template-library`, and nested template builder routes `template-builder/new` and
 * `template-builder/:templateId` (B-7 assembly layer; distinct from Template Enforcement).
 * B-8 AI governance: `ai-policy`, `ai-assistant`, `ai-audit`.
 *
 * Routes listed below remain stub surfaces until replaced by full pages.
 */
export const SETTINGS_PLACEHOLDER_ROUTES: Array<{ path: string; title: string }> = [
  { path: "profile", title: "Profile" },
  { path: "preferences", title: "Preferences" },
  { path: "notifications", title: "Notifications" },
  { path: "agentic-actions", title: "Agentic Actions" },
  { path: "ai-audit-trail", title: "AI Audit Trail" },
  { path: "phase-gates", title: "Phase Gates" },
];
