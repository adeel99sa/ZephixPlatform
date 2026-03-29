/**
 * Feature flags (Vite: use import.meta.env, not process.env).
 *
 * Comma-separated list in `VITE_FLAGS` (case-insensitive tokens), e.g.
 * `stagingMarketingLanding,FF_DASHBOARD_DUPLICATE`
 */

function viteFlagsTokens(): string[] {
  const raw = import.meta.env.VITE_FLAGS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Returns true if the flag name appears in `VITE_FLAGS` (comma-separated).
 * Names are compared case-insensitively (e.g. `FF_DASHBOARD_DUPLICATE`).
 */
export function hasFlag(name: string): boolean {
  const want = name.trim().toLowerCase();
  if (!want) return false;
  const tokens = viteFlagsTokens();
  if (tokens.includes(want)) return true;
  const noPrefix = want.startsWith("ff_") ? want.slice(3) : want;
  if (tokens.includes(`ff_${noPrefix}`)) return true;
  return false;
}

export function isNewTemplateCenterEnabled(): boolean {
  if (import.meta.env.VITE_NEW_TEMPLATE_CENTER === "true") {
    return true;
  }
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("newTemplateCenter") === "true") {
      return true;
    }
  } catch {
    /* SSR or private mode */
  }
  return false;
}

/** Staging-only marketing landing for guests on `/` — see docs/guides/STAGING_MARKETING_LANDING.md */
export function isStagingMarketingLandingEnabled(): boolean {
  const v = import.meta.env.VITE_STAGING_MARKETING_LANDING;
  if (v === "true" || v === "1") return true;
  return hasFlag("stagingMarketingLanding");
}

/** Floating beta feedback button */
export function isBetaMode(): boolean {
  const v = import.meta.env.VITE_BETA_MODE;
  if (v === "true" || v === "1") return true;
  return hasFlag("beta") || hasFlag("betaMode");
}

/** Project Resources tab — allocations UI */
export function isResourcesEnabled(): boolean {
  const v = import.meta.env.VITE_RESOURCES_ENABLED;
  if (v === "false" || v === "0") return false;
  return true;
}

/** Project Risks tab — create risk, etc. */
export function isRisksEnabled(): boolean {
  const v = import.meta.env.VITE_RISKS_ENABLED;
  if (v === "false" || v === "0") return false;
  return true;
}

/** Resource / capacity AI risk scoring blocks */
export function isResourceRiskAIEnabled(): boolean {
  const v = import.meta.env.VITE_RESOURCE_AI_RISK_SCORING_V1;
  if (v === "1" || v === "true") return true;
  return hasFlag("resourceRiskAI") || hasFlag("resourceriskai");
}

/** Workspace settings modal — membership v1 flows */
export function isWorkspaceMembershipV1Enabled(): boolean {
  const v = import.meta.env.VITE_WORKSPACE_MEMBERSHIP_V1;
  if (v === "false" || v === "0") return false;
  return true;
}
