import type { ReactElement } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";

type Tone = "default" | "purple" | "amber";

function SidebarLink({
  to,
  label,
  badge,
  tone = "default",
}: {
  to: string;
  label: string;
  badge?: string;
  tone?: Tone;
}): ReactElement {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          "mx-2 flex items-center justify-between gap-2 rounded-md py-1.5 pl-4 pr-2 text-sm transition-colors",
          tone === "default" &&
            (isActive
              ? "bg-slate-200/50 font-medium text-slate-900"
              : "text-slate-700 hover:bg-slate-200/50"),
          tone === "purple" &&
            (isActive
              ? "bg-violet-100/90 font-medium text-violet-950"
              : "text-slate-700 hover:bg-violet-50/80"),
          tone === "amber" &&
            (isActive
              ? "bg-amber-100/90 font-medium text-amber-950"
              : "text-slate-700 hover:bg-amber-50/80"),
        )
      }
    >
      <span className="truncate">{label}</span>
      {badge ? (
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            badge === "Pro" && "bg-indigo-100 text-indigo-700",
            badge === "New" && "bg-violet-200/80 text-violet-900",
            badge === "Core" && "bg-amber-200/80 text-amber-950",
          )}
        >
          {badge}
        </span>
      ) : null}
    </NavLink>
  );
}

function GroupLabel({
  children,
  first,
}: {
  children: string;
  /** Tighter top spacing for the first group under “Back to app”. */
  first?: boolean;
}): ReactElement {
  return (
    <p
      className={cn(
        "mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400",
        first ? "mt-4" : "mt-6",
      )}
    >
      {children}
    </p>
  );
}

function TemplateBuilderNavLink(): ReactElement {
  const { pathname } = useLocation();
  const active = pathname.startsWith("/settings/template-builder");
  return (
    <NavLink
      to="/settings/template-builder/new"
      className={cn(
        "mx-2 flex items-center justify-between gap-2 rounded-md py-1.5 pl-4 pr-2 text-sm transition-colors",
        active
          ? "bg-amber-100/90 font-medium text-amber-950"
          : "text-slate-700 hover:bg-amber-50/80",
      )}
    >
      <span className="truncate">Template Builder</span>
      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-200/80 text-amber-950">
        Preview
      </span>
    </NavLink>
  );
}

export function SettingsSidebar(): ReactElement {
  return (
    <nav className="pb-6 pt-2" aria-label="Settings">
      <Link
        to="/home"
        className="mb-2 block p-4 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        ← Back to app
      </Link>

      <GroupLabel first>My settings</GroupLabel>
      <SidebarLink to="/settings/profile" label="Profile" />
      <SidebarLink to="/settings/preferences" label="Preferences" />
      <SidebarLink to="/settings/notifications" label="Notifications" />

      <GroupLabel>Workspace</GroupLabel>
      <SidebarLink to="/settings/general" label="General" />
      <SidebarLink to="/settings/members" label="Members & Roles" />
      <SidebarLink to="/settings/teams" label="Teams" />
      <SidebarLink to="/settings/security-sso" label="Security & SSO" />
      <SidebarLink to="/settings/billing" label="Billing & Plan" />

      <GroupLabel>AI & agents</GroupLabel>
      <SidebarLink to="/settings/agentic-actions" label="Agentic Actions" tone="purple" />
      <SidebarLink to="/settings/ai-audit-trail" label="AI Audit Trail" tone="purple" />

      <GroupLabel>Governance (control plane)</GroupLabel>
      <SidebarLink to="/settings/ai-policy" label="AI Policy" tone="amber" />
      <SidebarLink to="/settings/ai-assistant" label="AI Assistant" tone="amber" />
      <SidebarLink to="/settings/ai-audit" label="AI Audit" tone="amber" />
      <SidebarLink to="/settings/policy-engine" label="Policy Engine" tone="amber" />
      <SidebarLink to="/settings/template-library" label="Template Library" tone="amber" />
      <TemplateBuilderNavLink />
      <SidebarLink to="/settings/template-enforcement" label="Template Enforcement" tone="amber" />
      <SidebarLink to="/settings/capacity-rules" label="Capacity Rules" tone="amber" />
      <SidebarLink to="/settings/phase-gates" label="Phase Gates" tone="amber" />
      <SidebarLink
        to="/settings/exception-workflows"
        label="Exception Workflows"
        tone="amber"
      />
      <SidebarLink to="/settings/audit-logs" label="Audit Logs" tone="amber" />

      <GroupLabel>Configuration (data plane)</GroupLabel>
      <SidebarLink to="/settings/custom-fields" label="Custom Fields" />
      <SidebarLink to="/settings/status-workflows" label="Status Workflows" />
      <SidebarLink to="/settings/risk-matrix" label="Risk Matrix" />
      <SidebarLink to="/settings/integrations" label="Integrations" />
    </nav>
  );
}
