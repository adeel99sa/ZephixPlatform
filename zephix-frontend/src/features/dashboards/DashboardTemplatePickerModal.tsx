import { X } from "lucide-react";

export type DashboardTemplateChoice =
  | "project_management"
  | "task_management"
  | "time_tracking"
  | "scratch";

interface DashboardTemplatePickerModalProps {
  open: boolean;
  onClose: () => void;
  onChoose: (choice: DashboardTemplateChoice) => void;
}

const TEMPLATE_CARDS: Array<{
  id: DashboardTemplateChoice;
  title: string;
  description: string;
}> = [
  {
    id: "task_management",
    title: "Task Management",
    description: "Manage and prioritize tasks",
  },
  {
    id: "project_management",
    title: "Project Management",
    description: "Analyze project progress and metrics",
  },
  {
    id: "time_tracking",
    title: "Time Tracking",
    description: "View and report on time tracking metrics",
  },
  {
    id: "scratch",
    title: "Start from scratch",
    description: "Create a blank dashboard layout",
  },
];

export function DashboardTemplatePickerModal({
  open,
  onClose,
  onChoose,
}: DashboardTemplatePickerModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/35 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between px-6 pb-2 pt-5">
          <div className="mx-auto text-center">
            <h2 className="text-3xl font-semibold text-slate-900">
              Choose a Dashboard template
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Get started with a dashboard template or create a custom dashboard
              to fit your exact needs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close dashboard template picker"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 pb-6 pt-4 md:grid-cols-2">
          {TEMPLATE_CARDS.map((template) => (
            <button
              key={template.id}
              onClick={() => onChoose(template.id)}
              className="rounded-xl border border-slate-200 p-5 text-left transition hover:border-indigo-300 hover:bg-indigo-50/30"
            >
              <h3 className="text-2xl font-semibold text-slate-900">
                {template.title}
              </h3>
              <p className="mt-2 text-sm text-slate-500">{template.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
