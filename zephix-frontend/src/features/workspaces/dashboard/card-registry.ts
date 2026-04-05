/**
 * Workspace dashboard card registry.
 * Single source of truth for all available insight cards.
 * Default cards (Pass 1) + addable cards (Pass 2).
 */

export type InsightCategory =
  | "project-health"
  | "tasks-delivery"
  | "risks"
  | "milestones"
  | "financials"
  | "activity";

export type CardDefinition = {
  id: string;
  title: string;
  description: string;
  category: InsightCategory;
  /** Default cards are always shown and cannot be removed in Pass 2 */
  isDefault: boolean;
  /** Whether this card has honest data support now */
  dataSupported: boolean;
};

export const CATEGORY_LABELS: Record<InsightCategory, string> = {
  "project-health": "Project Health",
  "tasks-delivery": "Tasks & Delivery",
  risks: "Risks",
  milestones: "Milestones",
  financials: "Financials",
  activity: "Activity",
};

/** All categories in display order */
export const CATEGORIES: InsightCategory[] = [
  "project-health",
  "tasks-delivery",
  "risks",
  "milestones",
  "financials",
  "activity",
];

/** Complete card registry — default 6 + addable cards */
export const CARD_REGISTRY: CardDefinition[] = [
  // ── Default 6 (Pass 1) ──
  {
    id: "project-health",
    title: "Project Health",
    description: "Summary of project health state across the workspace.",
    category: "project-health",
    isDefault: true,
    dataSupported: true,
  },
  {
    id: "tasks-in-progress",
    title: "Tasks In Progress",
    description: "Count of all in-progress tasks across workspace projects.",
    category: "tasks-delivery",
    isDefault: true,
    dataSupported: true,
  },
  {
    id: "overdue-work",
    title: "Overdue Work",
    description: "Tasks and milestones past their due date.",
    category: "tasks-delivery",
    isDefault: true,
    dataSupported: true,
  },
  {
    id: "upcoming-milestones",
    title: "Upcoming Milestones",
    description: "Milestones due soon across workspace projects.",
    category: "milestones",
    isDefault: true,
    dataSupported: true,
  },
  {
    id: "open-risks",
    title: "Open Risks",
    description: "Open risks with high severity emphasis.",
    category: "risks",
    isDefault: true,
    dataSupported: true,
  },
  {
    id: "budget-status",
    title: "Budget Status",
    description: "Budget health for projects in the workspace.",
    category: "financials",
    isDefault: true,
    dataSupported: true,
  },

  // ── Addable cards (Pass 2) ──
  {
    id: "project-status-distribution",
    title: "Project Status Distribution",
    description: "Visual breakdown of projects by their current status.",
    category: "project-health",
    isDefault: false,
    dataSupported: true,
  },
  {
    id: "completed-work",
    title: "Completed Work",
    description: "Tasks completed recently across the workspace.",
    category: "tasks-delivery",
    isDefault: false,
    dataSupported: true,
  },
  {
    id: "tasks-due-this-week",
    title: "Tasks Due This Week",
    description: "Work items due within the next 7 days.",
    category: "tasks-delivery",
    isDefault: false,
    dataSupported: true,
  },
  {
    id: "high-risks",
    title: "High Risks",
    description: "Risks rated high or critical that need attention.",
    category: "risks",
    isDefault: false,
    dataSupported: true,
  },
  {
    id: "projects-off-track",
    title: "Projects Off Track",
    description: "Projects with overdue work or blocked status.",
    category: "project-health",
    isDefault: false,
    dataSupported: true,
  },
  {
    id: "recent-activity",
    title: "Recent Activity",
    description: "Latest actions and updates across workspace projects.",
    category: "activity",
    isDefault: false,
    dataSupported: true,
  },
];

/** Get only default cards */
export function getDefaultCards(): CardDefinition[] {
  return CARD_REGISTRY.filter((c) => c.isDefault);
}

/** Get only addable (non-default, data-supported) cards */
export function getAddableCards(): CardDefinition[] {
  return CARD_REGISTRY.filter((c) => !c.isDefault && c.dataSupported);
}

/** Get card definition by ID */
export function getCardById(id: string): CardDefinition | undefined {
  return CARD_REGISTRY.find((c) => c.id === id);
}

/* ── Persistence (API-backed, workspace-scoped) ── */

import { api } from "@/lib/api";
import type { DashboardConfig, CardLayoutEntry } from "./layout-utils";

/**
 * Load full dashboard config from backend.
 * Backward compatible: old configs with only addedCards still work.
 */
export async function loadDashboardConfig(workspaceId: string): Promise<DashboardConfig> {
  try {
    const res = await api.get(`/workspaces/${workspaceId}/dashboard-config`);
    const raw = (res as any)?.data ?? res;
    const addedCards = Array.isArray(raw?.addedCards) ? raw.addedCards : [];
    const layout = Array.isArray(raw?.layout) ? raw.layout : undefined;

    // Filter added cards to only known, non-default, data-supported card IDs
    const validIds = new Set(getAddableCards().map((c) => c.id));
    return {
      addedCards: addedCards.filter((id: unknown) => typeof id === "string" && validIds.has(id)),
      layout,
    };
  } catch {
    return { addedCards: [] };
  }
}

/**
 * Save full dashboard config to backend.
 */
export async function saveDashboardConfig(
  workspaceId: string,
  config: DashboardConfig,
): Promise<void> {
  await api.patch(`/workspaces/${workspaceId}/dashboard-config`, config);
}

/** Convenience: save only addedCards (backward compat for Pass 2 callers) */
export async function saveAddedCardIds(
  workspaceId: string,
  cardIds: string[],
): Promise<void> {
  await api.patch(`/workspaces/${workspaceId}/dashboard-config`, {
    addedCards: cardIds,
  });
}

/** Convenience: still used by Pass 2 load path */
export async function loadAddedCardIds(workspaceId: string): Promise<string[]> {
  const config = await loadDashboardConfig(workspaceId);
  return config.addedCards;
}
