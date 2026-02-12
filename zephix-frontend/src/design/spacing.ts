// ─────────────────────────────────────────────────────────────────────────────
// Spacing Tokens — Step 21.3
//
// Consistent rhythm for all page and panel layouts.
// Import these instead of writing inline padding/gap classes.
// ─────────────────────────────────────────────────────────────────────────────

export const spacing = {
  /** Outer page padding */
  page: 'p-6',
  /** Panel / card inner padding */
  panel: 'p-4',
  /** Vertical spacing between sections */
  section: 'space-y-4',
  /** Tight vertical stack (form fields, list items) */
  stack: 'space-y-2',
  /** Horizontal gap between inline items */
  inlineGap: 'gap-3',
} as const;
