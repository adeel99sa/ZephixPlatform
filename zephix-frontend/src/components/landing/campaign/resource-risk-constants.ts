/**
 * Canonical campaign slug for URL + demo attribution (`?campaign=resource-risk`).
 * Route: `/campaign/resource-risk`. Do not alias as `risk-resource` or camelCase in URLs.
 */
export const RESOURCE_RISK_CAMPAIGN_SLUG = "resource-risk";

/** Primary enterprise demo CTA — routed form, not mailto */
export function demoPathForCampaign(slug: string): string {
  return `/demo?campaign=${encodeURIComponent(slug)}`;
}
