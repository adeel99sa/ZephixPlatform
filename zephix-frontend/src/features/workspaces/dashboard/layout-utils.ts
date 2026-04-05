/**
 * Pass 4 — Dashboard layout utilities.
 * Merges default cards + added cards into a persisted layout model.
 * Backward compatible with Pass 2.5 config (addedCards only, no layout).
 */
import { getDefaultCards, getCardById } from "./card-registry";

export type CardLayoutEntry = {
  cardId: string;
  /** Column span: 1 = half width, 2 = full width */
  colSpan: 1 | 2;
  order: number;
};

export type DashboardConfig = {
  addedCards: string[];
  layout?: CardLayoutEntry[];
};

/**
 * Build a complete ordered layout from persisted config.
 * Handles backward compatibility:
 * - If no layout exists, generates default order (6 defaults + added cards appended)
 * - If layout exists, merges it with current card set (handles new defaults, removed cards)
 * - Unknown card IDs are silently dropped
 */
export function buildLayout(config: DashboardConfig): CardLayoutEntry[] {
  const defaultIds = getDefaultCards().map((c) => c.id);
  const addedIds = config.addedCards ?? [];
  const allVisibleIds = [...defaultIds, ...addedIds];

  if (!config.layout || config.layout.length === 0) {
    // No persisted layout — generate default
    return allVisibleIds.map((id, i) => ({
      cardId: id,
      colSpan: 1 as const,
      order: i,
    }));
  }

  // Merge persisted layout with current visible cards
  const persistedMap = new Map<string, CardLayoutEntry>();
  for (const entry of config.layout) {
    if (getCardById(entry.cardId)) {
      persistedMap.set(entry.cardId, entry);
    }
    // Unknown cardIds silently dropped
  }

  const result: CardLayoutEntry[] = [];
  let maxOrder = -1;

  // First: add cards that have persisted layout entries, in persisted order
  const sorted = [...persistedMap.values()]
    .filter((e) => allVisibleIds.includes(e.cardId))
    .sort((a, b) => a.order - b.order);

  for (const entry of sorted) {
    result.push({ ...entry, colSpan: entry.colSpan === 2 ? 2 : 1 });
    if (entry.order > maxOrder) maxOrder = entry.order;
  }

  // Then: append any visible cards not in persisted layout (new defaults or newly added)
  for (const id of allVisibleIds) {
    if (!persistedMap.has(id)) {
      maxOrder++;
      result.push({ cardId: id, colSpan: 1, order: maxOrder });
    }
  }

  return result;
}

/**
 * Reorder layout after a drag-drop.
 * Returns new layout with updated order values.
 */
export function reorderLayout(
  layout: CardLayoutEntry[],
  fromIndex: number,
  toIndex: number,
): CardLayoutEntry[] {
  const items = [...layout];
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  return items.map((entry, i) => ({ ...entry, order: i }));
}

/**
 * Resize a card in the layout.
 * Returns new layout with updated colSpan.
 */
export function resizeCard(
  layout: CardLayoutEntry[],
  cardId: string,
  colSpan: 1 | 2,
): CardLayoutEntry[] {
  return layout.map((entry) =>
    entry.cardId === cardId ? { ...entry, colSpan } : entry,
  );
}

/**
 * Remove a card from the layout and re-index order.
 */
export function removeFromLayout(
  layout: CardLayoutEntry[],
  cardId: string,
): CardLayoutEntry[] {
  return layout
    .filter((e) => e.cardId !== cardId)
    .map((e, i) => ({ ...e, order: i }));
}
