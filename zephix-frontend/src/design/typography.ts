// ─────────────────────────────────────────────────────────────────────────────
// Typography Tokens — Step 21.2
//
// One reading rhythm for the entire product.
// Import these instead of writing inline font/size classes.
// ─────────────────────────────────────────────────────────────────────────────

export const typography = {
  /** Page-level headings (e.g. "Project Overview", "Workspace Home") */
  pageTitle: 'text-lg font-semibold text-slate-900',
  /** Section headings inside cards/panels */
  sectionTitle: 'text-sm font-semibold text-slate-800',
  /** Standard body text */
  body: 'text-sm text-slate-700',
  /** De-emphasized / secondary text */
  muted: 'text-xs text-slate-500',
  /** Labels on inputs, badge captions, panel subtitles */
  label: 'text-xs font-medium text-slate-600',
} as const;
