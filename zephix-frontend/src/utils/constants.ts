// src/utils/constants.ts

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://zephix-backend-production.up.railway.app/api';

// Allowed project status keys: 'planning', 'active', 'on_hold', 'completed', 'cancelled'
export const PROJECT_STATUS_LABELS = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const;

// Allowed priority keys: 'low', 'medium', 'high', 'critical'
export const PROJECT_PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
} as const;

// Tailwind color classes for use with dark backgrounds (recommended for dark UI)
export const PROJECT_STATUS_COLORS = {
  planning: 'bg-yellow-500/20 text-yellow-300',
  active: 'bg-green-500/20 text-green-300',
  on_hold: 'bg-orange-500/20 text-orange-300',
  completed: 'bg-blue-500/20 text-blue-300',
  cancelled: 'bg-red-500/20 text-red-300',
} as const;

export const PROJECT_PRIORITY_COLORS = {
  low: 'bg-gray-500/20 text-gray-300',
  medium: 'bg-blue-500/20 text-blue-300',
  high: 'bg-orange-500/20 text-orange-300',
  critical: 'bg-red-500/20 text-red-300',
} as const;

// For dropdowns or select components (optional, but future proof):
export const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));
export const PROJECT_PRIORITY_OPTIONS = Object.entries(PROJECT_PRIORITY_LABELS).map(([value, label]) => ({
  value,
  label,
}));
