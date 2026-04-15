import {
  ShieldCheck,
  FileStack,
  Users,
  Lock,
  UsersRound,
  Bell,
  ClipboardList,
  CreditCard,
  UserCircle,
  SlidersHorizontal,
  Building2,
  FolderInput,
  Plug,
  Trash2,
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

/**
 * Pre-MVP Admin Console design lock v2 — 14 items, 4 groups.
 * Personal (3) + admin-only (11). Every route either works or uses AdministrationComingSoonPage.
 */
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
    label: "Administration",
    adminOnly: true,
    items: [
      { label: "General", path: "/administration/general", icon: Building2 },
      { label: "People", path: "/administration/people", icon: Users },
      { label: "Teams", path: "/administration/teams", icon: UsersRound },
      {
        label: "Security & Permissions",
        path: "/administration/security",
        icon: Lock,
      },
    ],
  },
  {
    label: "Governance",
    adminOnly: true,
    items: [
      { label: "Policies", path: "/administration/governance", icon: ShieldCheck },
      { label: "Templates", path: "/administration/templates", icon: FileStack },
      { label: "Audit Trail", path: "/administration/audit-trail", icon: ClipboardList },
    ],
  },
  {
    label: "System",
    adminOnly: true,
    items: [
      {
        label: "Import / Export",
        path: "/administration/import-export",
        icon: FolderInput,
      },
      {
        label: "Integrations",
        path: "/administration/integrations",
        icon: Plug,
      },
      { label: "Trash", path: "/administration/trash", icon: Trash2 },
      { label: "Billing", path: "/administration/billing", icon: CreditCard },
    ],
  },
];

/** Flat list of all nav items — used by layout for rendering and by tests. */
export const ADMINISTRATION_NAV_ITEMS: AdministrationNavItem[] =
  ADMINISTRATION_NAV_GROUPS.flatMap((group) => group.items);
