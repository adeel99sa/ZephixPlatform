export type InboxFilter = 'all' | 'unread' | 'dismissed';

const VALID_FILTERS = new Set<InboxFilter>(['all', 'unread', 'dismissed']);

/** Derive inbox list filter from `?filter=` search param (/inbox = all). */
export function parseInboxFilterFromSearchParams(params: URLSearchParams): InboxFilter {
  const raw = params.get('filter');
  if (raw && VALID_FILTERS.has(raw as InboxFilter) && raw !== 'all') {
    return raw as InboxFilter;
  }
  return 'all';
}

/** Build search params object for setSearchParams — omits param when filter is all. */
export function applyInboxFilterToSearchParams(
  current: URLSearchParams,
  filter: InboxFilter,
): Record<string, string> {
  const next = new URLSearchParams(current);
  if (filter === 'all') {
    next.delete('filter');
  } else {
    next.set('filter', filter);
  }
  return Object.fromEntries(next.entries());
}

/** Canonical inbox path for sidebar / brand reset (All filter). */
export const INBOX_ALL_PATH = '/inbox';
