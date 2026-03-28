// ─────────────────────────────────────────────────────────────────────────────
// Semantic Design Tokens — Step 21.1
//
// Single source of truth for intent-based colors across the entire UI.
// Never use raw Tailwind intent colors in views. Always import from here.
// ─────────────────────────────────────────────────────────────────────────────

export const intentColors = {
  success: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
    borderSubtle: 'border-green-100',
    badge: 'bg-green-100 text-green-800',
    dot: 'bg-green-500',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    borderSubtle: 'border-amber-100',
    badge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500',
  },
  danger: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    borderSubtle: 'border-red-100',
    badge: 'bg-red-100 text-red-800',
    dot: 'bg-red-500',
  },
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    borderSubtle: 'border-blue-100',
    badge: 'bg-blue-100 text-blue-800',
    dot: 'bg-blue-500',
  },
  neutral: {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    borderSubtle: 'border-slate-100',
    badge: 'bg-gray-100 text-gray-600',
    dot: 'bg-gray-400',
  },
} as const;

export type IntentKey = keyof typeof intentColors;
