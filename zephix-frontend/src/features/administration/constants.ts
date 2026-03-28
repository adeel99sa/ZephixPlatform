import {
  LayoutGrid,
  ShieldCheck,
  Building2,
  FileStack,
  Users,
  ClipboardList,
  Settings,
  CreditCard,
} from "lucide-react";
import type { ComponentType } from "react";

export type AdministrationNavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

export const ADMINISTRATION_NAV_ITEMS: AdministrationNavItem[] = [
  { label: "Overview", path: "/administration", icon: LayoutGrid },
  { label: "Governance", path: "/administration/governance", icon: ShieldCheck },
  { label: "Workspaces", path: "/administration/workspaces", icon: Building2 },
  { label: "Templates", path: "/administration/templates", icon: FileStack },
  { label: "Users", path: "/administration/users", icon: Users },
  { label: "Audit Log", path: "/administration/audit-log", icon: ClipboardList },
  { label: "Settings", path: "/administration/settings", icon: Settings },
  { label: "Billing", path: "/administration/billing", icon: CreditCard },
];
