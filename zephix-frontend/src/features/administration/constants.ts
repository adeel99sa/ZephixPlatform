import {
  LayoutGrid,
  ShieldCheck,
  Building2,
  FileStack,
  Users,
  Lock,
  UsersRound,
  Bell,
  ClipboardList,
  CreditCard,
  UserCircle,
  SlidersHorizontal,
} from "lucide-react";
import type { ComponentType } from "react";

export type AdministrationNavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  /** Opens workspaces browser modal (?workspaces=1) instead of navigating to `path`. */
  opensWorkspacesModal?: boolean;
};

export type AdministrationNavGroup = {
  label: string;
  items: AdministrationNavItem[];
  /** When true, only platform admins see this group. */
  adminOnly?: boolean;
};

export const ADMINISTRATION_NAV_GROUPS: AdministrationNavGroup[] = [
  {
    label: "My Settings",
    adminOnly: false,
    items: [
      { label: "Profile", path: "/administration/profile", icon: UserCircle },
      { label: "Preferences", path: "/administration/preferences", icon: SlidersHorizontal },
      { label: "Notifications", path: "/administration/notifications", icon: Bell },
    ],
  },
  {
    label: "Platform Management",
    adminOnly: true,
    items: [
      { label: "Overview", path: "/administration", icon: LayoutGrid },
      { label: "Governance", path: "/administration/governance", icon: ShieldCheck },
      {
        label: "Workspaces",
        path: "/administration/workspaces",
        icon: Building2,
        opensWorkspacesModal: true,
      },
      { label: "Templates", path: "/administration/templates", icon: FileStack },
    ],
  },
  {
    label: "People & Access",
    adminOnly: true,
    items: [
      { label: "People", path: "/administration/people", icon: Users },
      { label: "Security", path: "/administration/security", icon: Lock },
    ],
  },
  {
    label: "Organization",
    adminOnly: true,
    items: [{ label: "Teams", path: "/administration/teams", icon: UsersRound }],
  },
  {
    label: "System",
    adminOnly: true,
    items: [
      { label: "Audit Trail", path: "/administration/audit-trail", icon: ClipboardList },
      { label: "Billing", path: "/administration/billing", icon: CreditCard },
    ],
  },
];

/** Flat list of all nav items — used by layout for rendering and by tests. */
export const ADMINISTRATION_NAV_ITEMS: AdministrationNavItem[] =
  ADMINISTRATION_NAV_GROUPS.flatMap((group) => group.items);
