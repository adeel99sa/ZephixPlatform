import { useState } from "react";
import { Switch } from "@/components/ui/form/Switch";
import { cn } from "@/lib/utils";

const LOCK_OPTIONS = [
  "Phase Gates",
  "Approval Workflows",
  "Required Risk Fields",
  "Budget Controls",
  "Audit Fields",
] as const;

const SCOPE_CARDS = [
  { title: "Org Default", description: "Applied to all new workspaces", template: "Agile Standard", type: "default" as const },
  { title: "Finance Group", description: "5 workspaces affected", template: "SOX Compliance Baseline", type: "mandatory" as const, locked: ["Phase Gates", "Audit Fields"] },
  { title: "Engineering Group", description: "12 workspaces affected", template: "DevOps Standard", type: "default" as const },
  { title: "Special Project Alpha", description: "Specific workspace override", template: "Custom Compliance", type: "mandatory" as const, locked: ["All Governance"] },
];

function LockToggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked ?? false);
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
        "border-z-border bg-z-bg-sunken text-z-text-secondary",
        "hover:border-z-border-strong"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="rounded text-z-blue-600"
      />
      <span>{label}</span>
    </label>
  );
}

function ScopeCard({
  title,
  description,
  template,
  type,
  locked,
}: {
  title: string;
  description: string;
  template: string;
  type: "default" | "mandatory";
  locked?: string[];
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        type === "mandatory"
          ? "border-amber-200 bg-amber-50/50"
          : "border-z-border bg-z-bg-elevated"
      )}
    >
      <div className="font-medium text-z-text-primary">{title}</div>
      <div className="mt-1 text-sm text-z-text-secondary">{description}</div>
      <div className="mt-2 text-sm font-medium text-z-text-primary">
        Template: {template}
      </div>
      {locked && locked.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {locked.map((l) => (
            <span
              key={l}
              className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
            >
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdministrationTemplateGovernancePage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-z-text-primary">Template Governance</h1>
        <p className="mt-1 text-z-text-secondary">
          Define baselines and extension policies
        </p>
      </header>

      {/* Section A: Template Library Policy */}
      <section className="rounded-xl border border-z-border bg-z-bg-elevated p-6">
        <h2 className="mb-4 text-lg font-semibold text-z-text-primary">
          A. Template Library Access
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-z-bg-sunken p-4">
            <div>
              <div className="font-medium text-z-text-primary">
                Enable Template Library
              </div>
              <div className="text-sm text-z-text-secondary">
                Workspace owners can browse and add templates
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-z-bg-sunken p-4">
            <div>
              <div className="font-medium text-z-text-primary">
                Allow Custom Workspace Templates
              </div>
              <div className="text-sm text-z-text-secondary">
                Owners can create templates for their workspace only
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-z-bg-sunken p-4">
            <div>
              <div className="font-medium text-z-text-primary">
                Require Approval for Publishing
              </div>
              <div className="text-sm text-z-text-secondary">
                Custom templates must be approved before use
              </div>
            </div>
            <Switch />
          </div>
        </div>
      </section>

      {/* Section B: Baseline Assignment */}
      <section className="rounded-xl border border-z-border bg-z-bg-elevated p-6">
        <h2 className="mb-4 text-lg font-semibold text-z-text-primary">
          B. Baseline Templates
        </h2>

        <div className="space-y-6">
          {/* Default Template */}
          <div className="rounded-lg border border-z-border p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                Default
              </span>
              <span className="text-sm text-z-text-secondary">
                Starting template, workspace owner can change
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <select className="rounded-lg border border-z-border bg-z-bg-base px-3 py-2">
                <option>Financial Services Delivery</option>
                <option>Agile Development</option>
                <option>Compliance Audit</option>
              </select>
              <select className="rounded-lg border border-z-border bg-z-bg-base px-3 py-2">
                <option>Org-wide</option>
                <option>Finance Group</option>
                <option>Engineering Group</option>
              </select>
            </div>
          </div>

          {/* Mandatory Baseline */}
          <div className="rounded-lg border border-z-border bg-amber-50/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                Mandatory
              </span>
              <span className="text-sm text-z-text-secondary">
                Required baseline, workspace owner cannot remove locked parts
              </span>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <select className="rounded-lg border border-z-border bg-z-bg-base px-3 py-2">
                <option>SOX Compliance Baseline</option>
                <option>Enterprise Risk Framework</option>
              </select>
              <select className="rounded-lg border border-z-border bg-z-bg-base px-3 py-2">
                <option>Finance Group</option>
                <option>All Workspaces</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="mb-2 text-sm font-medium text-z-text-primary">
                Lock these components:
              </div>
              <div className="flex flex-wrap gap-2">
                {LOCK_OPTIONS.map((opt) => (
                  <LockToggle
                    key={opt}
                    label={opt}
                    defaultChecked={
                      ["Phase Gates", "Approval Workflows", "Required Risk Fields", "Budget Controls", "Audit Fields"].includes(opt)
                    }
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-z-border pt-4">
              <div className="mb-2 text-sm font-medium text-z-text-primary">
                Workspace owner can add:
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="rounded" />
                  Views
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="rounded" />
                  Custom Fields
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="rounded" />
                  Automations
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  Team Layouts
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section C: Scope Targeting */}
      <section className="rounded-xl border border-z-border bg-z-bg-elevated p-6">
        <h2 className="mb-4 text-lg font-semibold text-z-text-primary">
          C. Assignment Scope
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SCOPE_CARDS.map((card) => (
            <ScopeCard key={card.title} {...card} />
          ))}
        </div>
      </section>
    </div>
  );
}
