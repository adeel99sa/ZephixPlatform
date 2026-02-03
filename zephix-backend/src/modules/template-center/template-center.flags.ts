/**
 * Feature flag for Template Center v1 apply and mutation endpoints.
 * When false, apply and mutation endpoints return 404 to hide the feature.
 */
export function isTemplateCenterEnabled(): boolean {
  return String(process.env.TEMPLATE_CENTER_V1 || '').toLowerCase() === 'true';
}
