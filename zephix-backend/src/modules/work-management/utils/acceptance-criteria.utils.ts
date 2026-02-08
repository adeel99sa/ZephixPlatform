/**
 * Shared types and normalization for acceptance criteria and Definition of Done.
 */

export interface AcceptanceCriteriaItem {
  text: string;
  done: boolean;
}

const MAX_AC_ITEMS = 20;
const MAX_DOD_ITEMS = 20;
const MAX_ITEM_LENGTH = 240;

/** Collapse multiple whitespace to single space. */
function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Normalize and validate acceptance criteria items.
 * - Trims whitespace
 * - Collapses multiple spaces
 * - Removes empty items
 * - Preserves order
 * - Truncates to max 20 items
 * - Truncates each text to 240 chars
 */
export function normalizeAcceptanceCriteria(
  items: AcceptanceCriteriaItem[],
): AcceptanceCriteriaItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      text: collapseSpaces(String(item?.text ?? '')).slice(0, MAX_ITEM_LENGTH),
      done: Boolean(item?.done),
    }))
    .filter((item) => item.text.length > 0)
    .slice(0, MAX_AC_ITEMS);
}

/**
 * Validate acceptance criteria input. Throws descriptive messages.
 */
export function validateAcceptanceCriteria(
  items: unknown[],
): string | null {
  if (!Array.isArray(items)) return 'acceptanceCriteria must be an array';
  if (items.length > MAX_AC_ITEMS)
    return `acceptanceCriteria cannot have more than ${MAX_AC_ITEMS} items`;
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as any;
    if (!item || typeof item !== 'object') return `Item ${i} must be an object`;
    if (typeof item.text !== 'string') return `Item ${i}.text must be a string`;
    if (typeof item.done !== 'boolean') return `Item ${i}.done must be a boolean`;
    const trimmed = collapseSpaces(item.text);
    if (trimmed.length === 0) continue; // will be filtered
    if (trimmed.length > MAX_ITEM_LENGTH)
      return `Item ${i}.text exceeds ${MAX_ITEM_LENGTH} characters`;
  }
  return null;
}

/**
 * Normalize and validate Definition of Done items (string list).
 * - Trims whitespace
 * - Collapses multiple spaces
 * - Removes empty items
 * - Preserves order
 * - Truncates to max 20 items
 * - Truncates each text to 240 chars
 */
export function normalizeDefinitionOfDone(items: string[]): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((s) => collapseSpaces(String(s ?? '')).slice(0, MAX_ITEM_LENGTH))
    .filter((s) => s.length > 0)
    .slice(0, MAX_DOD_ITEMS);
}

/**
 * Validate Definition of Done input. Throws descriptive messages.
 */
export function validateDefinitionOfDone(items: unknown[]): string | null {
  if (!Array.isArray(items)) return 'definitionOfDone must be an array';
  if (items.length > MAX_DOD_ITEMS)
    return `definitionOfDone cannot have more than ${MAX_DOD_ITEMS} items`;
  for (let i = 0; i < items.length; i++) {
    if (typeof items[i] !== 'string')
      return `Item ${i} must be a string`;
    const trimmed = collapseSpaces(items[i] as string);
    if (trimmed.length > MAX_ITEM_LENGTH)
      return `Item ${i} exceeds ${MAX_ITEM_LENGTH} characters`;
  }
  return null;
}
