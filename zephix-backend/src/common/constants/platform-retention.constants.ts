/**
 * Default days items stay in Trash (soft-deleted) before scheduled purge removes them.
 * Align with TRASH_RETENTION_DAYS, purgeOldTrash (workspaces), and purgeOldTrashedProjects.
 */
export const PLATFORM_TRASH_RETENTION_DAYS_DEFAULT = Number(
  process.env.TRASH_RETENTION_DAYS ?? process.env.PLATFORM_TRASH_RETENTION_DAYS ?? 30,
);

/**
 * Validate retention and cron configuration at startup.
 * Call from AppModule.onModuleInit() or main.ts bootstrap.
 * Throws if configuration is invalid to fail fast.
 */
export function validateRetentionConfig(): void {
  const days = PLATFORM_TRASH_RETENTION_DAYS_DEFAULT;

  if (!Number.isFinite(days) || days < 1 || days > 3650) {
    throw new Error(
      `Invalid TRASH_RETENTION_DAYS: ${days}. Must be between 1 and 3650.`,
    );
  }

  const cronEnabled = process.env.RETENTION_PURGE_CRON_ENABLED === '1';
  if (cronEnabled) {
    const cronExpr =
      process.env.RETENTION_PURGE_CRON_EXPRESSION || '0 3 * * *';
    // Basic cron expression validation: 5 space-separated fields
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length < 5 || parts.length > 6) {
      throw new Error(
        `Invalid RETENTION_PURGE_CRON_EXPRESSION: "${cronExpr}". Expected 5-6 space-separated fields.`,
      );
    }
  }
}
