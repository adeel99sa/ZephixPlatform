/**
 * TC-B2 / AD-029 — canonical template methodology vocabulary.
 *
 * `methodology` is the single canonical field for a template's delivery style.
 * `delivery_method` is DEPRECATED-AD029 (stop-write; column retained). The four
 * canonical values are lowercase. `agile` is folded into `scrum` (founder T6
 * merge). This module is the one source of the vocabulary + mapping rule; the
 * migration, seed, and validation all agree with it.
 */
export const CANONICAL_METHODOLOGIES = [
  'waterfall',
  'scrum',
  'kanban',
  'hybrid',
] as const;

export type CanonicalMethodology = (typeof CANONICAL_METHODOLOGIES)[number];

export function isCanonicalMethodology(
  value: unknown,
): value is CanonicalMethodology {
  return (
    typeof value === 'string' &&
    (CANONICAL_METHODOLOGIES as readonly string[]).includes(value)
  );
}

/**
 * Resolve a canonical methodology from a (methodology, deliveryMethod) pair.
 *
 * Rules (founder-approved):
 *  - `delivery_method` wins when it is one of the four canonical values (it is
 *    the more specific, curated signal): SCRUM→scrum, KANBAN→kanban,
 *    WATERFALL→waterfall, HYBRID→hybrid (case-insensitive).
 *  - else `methodology` 'agile' → 'scrum' (T6 merge).
 *  - else `methodology` already canonical → passthrough (lowercased).
 *  - else → null (unmappable; caller decides — do not guess).
 */
export function canonicalizeMethodology(
  methodology?: string | null,
  deliveryMethod?: string | null,
): CanonicalMethodology | null {
  const dm = deliveryMethod?.trim().toLowerCase();
  if (dm && isCanonicalMethodology(dm)) {
    return dm;
  }
  const m = methodology?.trim().toLowerCase();
  if (!m) return null;
  if (m === 'agile') return 'scrum';
  if (isCanonicalMethodology(m)) return m;
  return null;
}
