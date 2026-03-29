import {
  LayoutGrid,
  Building2,
  Shield,
  Users,
  UsersRound,
  KeyRound,
  ClipboardList,
  Plug,
  Bot,
  CreditCard,
  Database,
  FileStack,
} from "lucide-react";
import type { ComponentType } from "react";

export type AdministrationNavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

export type AdministrationNavSection = {
  label: string;
  items: AdministrationNavItem[];
};

export const ADMINISTRATION_NAV_SECTIONS: AdministrationNavSection[] = [
  {
    label: "Overview",
    items: [
      { label: "Overview", path: "/administration/general", icon: LayoutGrid },
    ],
  },
  {
    label: "Organization",
    items: [
      { label: "Organization", path: "/administration/organization", icon: Building2 },
      { label: "Users", path: "/administration/users", icon: Users },
      { label: "Teams", path: "/administration/teams", icon: UsersRound },
    ],
  },
  {
    label: "Governance",
    items: [
      { label: "Template Governance", path: "/administration/template-governance", icon: FileStack },
      { label: "Access Control", path: "/administration/access-control", icon: KeyRound },
      { label: "Audit Logs", path: "/administration/audit-log", icon: ClipboardList },
      { label: "AI Governance", path: "/administration/ai-governance", icon: Bot },
    ],
  },
  {
    label: "Security",
    items: [
      { label: "Security", path: "/administration/security", icon: Shield },
      { label: "Integrations", path: "/administration/integrations", icon: Plug },
      { label: "Data Management", path: "/administration/data-management", icon: Database },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Billing", path: "/administration/billing", icon: CreditCard },
    ],
  },
];
