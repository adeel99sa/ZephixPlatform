import {
  LayoutGrid,
  ShieldCheck,
  Building2,
  FileStack,
  Users,
  Lock,
  Landmark,
  UsersRound,
  Bell,
  ClipboardList,
  CreditCard,
} from "lucide-react";
import type { ComponentType } from "react";

export type AdministrationNavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

export type AdministrationNavGroup = {
  label: string;
  items: AdministrationNavItem[];
};

export const ADMINISTRATION_NAV_GROUPS: AdministrationNavGroup[] = [
  {
    label: "Platform Management",
    items: [
      { label: "Overview", path: "/administration", icon: LayoutGrid },
      { label: "Governance", path: "/administration/governance", icon: ShieldCheck },
      { label: "Workspaces", path: "/administration/workspaces", icon: Building2 },
      { label: "Templates", path: "/administration/templates", icon: FileStack },
    ],
  },
  {
    label: "People & Access",
    items: [
      { label: "People", path: "/administration/people", icon: Users },
      { label: "Security", path: "/administration/security", icon: Lock },
    ],
  },
  {
    label: "Organization",
    items: [
      { label: "Organization", path: "/administration/organization", icon: Landmark },
      { label: "Teams", path: "/administration/teams", icon: UsersRound },
      { label: "Notifications", path: "/administration/notifications", icon: Bell },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Audit Trail", path: "/administration/audit-trail", icon: ClipboardList },
      { label: "Billing", path: "/administration/billing", icon: CreditCard },
    ],
  },
];

/** Flat list of all nav items — used by layout for rendering and by tests. */
export const ADMINISTRATION_NAV_ITEMS: AdministrationNavItem[] =
  ADMINISTRATION_NAV_GROUPS.flatMap((group) => group.items);
