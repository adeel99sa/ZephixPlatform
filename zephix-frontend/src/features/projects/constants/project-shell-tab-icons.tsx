/**
 * Lucide icons for progressive shell tab keys (add-tab menu + future UI).
 * Keys mirror {@link ALLOWED_PROJECT_SHELL_TAB_KEYS}.
 */
import {
  BarChart3,
  CheckCircle2,
  CircleDot,
  FileText,
  LayoutDashboard,
  ListChecks,
  Map,
  PlayCircle,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

import type { ProjectShellTabKey } from "./project-shell-tabs";

export const PROJECT_SHELL_TAB_ICONS: Record<ProjectShellTabKey, LucideIcon> = {
  overview: LayoutDashboard,
  tasks: ListChecks,
  plan: Map,
  execution: PlayCircle,
  approvals: CheckCircle2,
  raid: ShieldAlert,
  reports: BarChart3,
  documents: FileText,
};

export function projectShellTabIcon(key: string): LucideIcon {
  const k = String(key).trim().toLowerCase();
  return (
    PROJECT_SHELL_TAB_ICONS[k as ProjectShellTabKey] ?? CircleDot
  );
}
