/** Amber badge for disabled optional / not-yet-shipped property rows. */
export function ComingSoonBadge() {
  return (
    <span
      className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200"
      data-testid="fields-coming-soon-badge"
    >
      Coming soon
    </span>
  );
}
