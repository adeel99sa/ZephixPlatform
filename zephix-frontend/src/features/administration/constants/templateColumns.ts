/**
 * Admin Templates → Columns tab: catalog of keys persisted on `Template.columnConfig`
 * and/or surfaced on the work-task row model. Keys must stay backward-compatible with
 * existing template seeds (`phase`, `labels`, `storyPoints`, …) and `work_tasks` fields.
 */
export interface ColumnDefinition {
  key: string;
  label: string;
  category: "core" | "schedule" | "effort" | "agile" | "governance" | "meta";
  alwaysVisible?: boolean;
}

export const TEMPLATE_COLUMNS: ColumnDefinition[] = [
  { key: "title", label: "Task name", category: "core", alwaysVisible: true },
  { key: "status", label: "Status", category: "core", alwaysVisible: true },
  { key: "assignee", label: "Assignee", category: "core" },
  { key: "priority", label: "Priority", category: "core" },
  { key: "type", label: "Task type", category: "core" },
  { key: "completion", label: "Completion %", category: "core" },
  { key: "remarks", label: "Remarks", category: "core" },
  { key: "description", label: "Description", category: "core" },

  { key: "startDate", label: "Start date", category: "schedule" },
  { key: "dueDate", label: "Due date", category: "schedule" },
  { key: "duration", label: "Duration (days)", category: "schedule" },
  { key: "plannedStartAt", label: "Planned start", category: "schedule" },
  { key: "plannedEndAt", label: "Planned end", category: "schedule" },
  { key: "actualStartAt", label: "Actual start", category: "schedule" },
  { key: "actualEndAt", label: "Actual end", category: "schedule" },
  { key: "constraintType", label: "Constraint type", category: "schedule" },
  { key: "constraintDate", label: "Constraint date", category: "schedule" },
  { key: "isMilestone", label: "Milestone", category: "schedule" },
  { key: "wbsCode", label: "WBS code", category: "schedule" },
  { key: "phase", label: "Phase", category: "schedule" },
  { key: "milestone", label: "Milestone (template flag)", category: "schedule" },
  { key: "dependency", label: "Dependencies", category: "schedule" },

  { key: "estimateHours", label: "Estimate hours", category: "effort" },
  { key: "actualHours", label: "Actual hours", category: "effort" },
  { key: "remainingHours", label: "Remaining hours", category: "effort" },

  { key: "estimatePoints", label: "Story points", category: "agile" },
  { key: "storyPoints", label: "Story points (template flag)", category: "agile" },
  { key: "committed", label: "Committed", category: "agile" },
  { key: "iteration", label: "Sprint / iteration", category: "agile" },
  { key: "sprint", label: "Sprint (template flag)", category: "agile" },
  { key: "epic", label: "Epic", category: "agile" },
  { key: "wipLimit", label: "WIP limit", category: "agile" },
  { key: "cycleTime", label: "Cycle time", category: "agile" },
  { key: "leadTime", label: "Lead time", category: "agile" },
  { key: "labels", label: "Labels", category: "agile" },

  { key: "approvalStatus", label: "Approval status", category: "governance" },
  { key: "documentRequired", label: "Document required", category: "governance" },

  { key: "reporter", label: "Reporter", category: "meta" },
  { key: "createdAt", label: "Created", category: "meta" },
  { key: "updatedAt", label: "Updated", category: "meta" },
  { key: "tags", label: "Tags", category: "meta" },
];

export const COLUMN_CATEGORIES: Array<{ key: ColumnDefinition["category"]; label: string }> = [
  { key: "core", label: "Core" },
  { key: "schedule", label: "Schedule" },
  { key: "effort", label: "Effort tracking" },
  { key: "agile", label: "Agile" },
  { key: "governance", label: "Governance" },
  { key: "meta", label: "Metadata" },
];
