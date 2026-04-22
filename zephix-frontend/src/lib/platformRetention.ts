/**
 * Default trash retention (days) — must match backend
 * `PLATFORM_TRASH_RETENTION_DAYS_DEFAULT` / `TRASH_RETENTION_DAYS` (default 30).
 */
export const PLATFORM_TRASH_RETENTION_DAYS = 30;

export function trashRetentionDaysFromPayload(
  payload: unknown,
  fallback: number = PLATFORM_TRASH_RETENTION_DAYS,
): number {
  const d = (payload as { trashRetentionDays?: number } | null)?.trashRetentionDays;
  return typeof d === 'number' && d > 0 ? d : fallback;
}

/**
 * Archive and delete use the same soft removal: items sit in Archive & delete for the
 * platform retention window (default 30 days), then are permanently purged.
 */
export function archiveAndDeleteContainerSentence(days: number): string {
  return `Goes to Archive & delete for ${days} days (platform default). You can restore until then; after that it is permanently removed.`;
}

/** User-facing line for delete → Archive & delete (soft delete + scheduled purge). */
export function trashRetentionDeleteSentence(days: number): string {
  return archiveAndDeleteContainerSentence(days);
}

/** User-facing line for archive → same container and retention as delete. */
export function trashRetentionArchiveSentence(days: number): string {
  return archiveAndDeleteContainerSentence(days);
}
