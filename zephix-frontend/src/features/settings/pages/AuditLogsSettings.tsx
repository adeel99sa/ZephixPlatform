import { useState } from "react";
import type { ReactElement } from "react";

import { SETTINGS_TABLE_SELECT_CLASS } from "../constants/memberRoles";
import { SettingsPageHeader } from "../components/ui";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input/Input";
import { cn } from "@/lib/utils";


type AuditFilter = "all" | "gate_decisions" | "state_overrides" | "template_updates";

type MockRow = {
  id: string;
  timestamp: string;
  actor: string;
  eventTone: "indigo" | "amber" | "slate";
  /** Singular label per row; filter dropdown uses plural category names. */
  eventLabel: string;
  entity: string;
  details: string;
};

const MOCK_ROWS: MockRow[] = [
  {
    id: "1",
    timestamp: "Oct 24, 2026 14:32",
    actor: "Sarah Connor (Governance)",
    eventTone: "indigo",
    eventLabel: "Gate Decision",
    entity: "Project Alpha → Phase 2 Gate",
    details: "Decision: CONDITIONAL_GO. Created 2 conditions.",
  },
  {
    id: "2",
    timestamp: "Oct 24, 2026 10:15",
    actor: "John Smith (Admin)",
    eventTone: "amber",
    eventLabel: "State Override",
    entity: "Task: Final Security Review",
    details:
      "Forced state from BLOCKED to DONE. Justification: Approved offline.",
  },
  {
    id: "3",
    timestamp: "Oct 23, 2026 16:48",
    actor: "System",
    eventTone: "slate",
    eventLabel: "Template Update",
    entity: "Template: Waterfall Standard",
    details: "Delta published. Awaiting project owner review.",
  },
];

/** Align indigo/amber badge tokens with `SettingsRow` (governance emphasis). */
function eventBadgeClass(tone: MockRow["eventTone"]): string {
  switch (tone) {
    case "indigo":
      return "bg-indigo-100 text-indigo-700";
    case "amber":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export default function AuditLogsSettings(): ReactElement {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AuditFilter>("all");

  return (
    <div data-settings-audit-logs>
      <SettingsPageHeader
        title="Audit Logs"
        description="A chronological, immutable record of governance events and state changes."
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <Input
            className="max-w-md"
            placeholder="Search events or users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search audit events"
          />
          <select
            className={cn(SETTINGS_TABLE_SELECT_CLASS, "max-w-[200px] shrink-0")}
            value={filter}
            onChange={(e) => setFilter(e.target.value as AuditFilter)}
            aria-label="Filter audit events"
          >
            <option value="all">All Events</option>
            <option value="gate_decisions">Gate Decisions</option>
            <option value="state_overrides">State Overrides</option>
            <option value="template_updates">Template Updates</option>
          </select>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          onClick={() => {
            /* UI only — export in a later milestone */
          }}
        >
          Export CSV
        </Button>
      </div>

      <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Timestamp
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Actor
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Event type
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Entity
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ROWS.map((row) => (
              <tr
                key={row.id}
                className="min-h-[56px] border-b border-slate-100 last:border-0"
              >
                <td className="min-h-[56px] whitespace-nowrap px-4 py-4 align-top text-slate-700">
                  {row.timestamp}
                </td>
                <td className="min-h-[56px] px-4 py-4 align-top text-slate-800">
                  {row.actor}
                </td>
                <td className="min-h-[56px] px-4 py-4 align-top">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      eventBadgeClass(row.eventTone),
                    )}
                  >
                    {row.eventLabel}
                  </span>
                </td>
                <td className="min-h-[56px] px-4 py-4 align-top text-slate-800">
                  {row.entity}
                </td>
                <td className="min-h-[56px] max-w-md px-4 py-4 align-top text-slate-600">
                  {row.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
