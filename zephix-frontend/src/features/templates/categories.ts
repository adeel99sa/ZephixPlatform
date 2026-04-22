/**
 * Phase 5A — Template Center category-first IA.
 *
 * Five fixed top-level project-template categories. The order here is the
 * canonical left-rail order. Mirrors the backend
 * `ProjectTemplateCategory` union from
 * `zephix-backend/src/modules/templates/data/system-template-definitions.ts`.
 *
 * Rules:
 * - The list is fixed for v1. Do not allow custom categories on system or
 *   workspace templates yet.
 * - Categories are presentation only — every card under a category must be
 *   a real backend template row whose `category` field equals the label.
 * - The frontend never invents categories; it does not fall back to
 *   methodology grouping when category is missing. Missing-category
 *   templates fall into "Other".
 */

export const PROJECT_TEMPLATE_CATEGORIES = [
  'Project Management',
  'Product Management',
  'Software Development',
  'Operations',
  'Startups',
] as const;

export type ProjectTemplateCategory =
  (typeof PROJECT_TEMPLATE_CATEGORIES)[number];

export function isProjectTemplateCategory(
  v: unknown,
): v is ProjectTemplateCategory {
  return (
    typeof v === 'string' &&
    (PROJECT_TEMPLATE_CATEGORIES as readonly string[]).includes(v)
  );
}
