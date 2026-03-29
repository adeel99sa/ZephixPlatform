import type { ReactElement } from "react";
import { LayoutTemplate, Shield } from "lucide-react";

import type { TemplateLike } from "@/features/templates/lib/templateGalleryModel";

const THUMB_BACKGROUNDS = [
  "bg-sky-50",
  "bg-violet-50",
  "bg-emerald-50",
  "bg-amber-50",
  "bg-rose-50",
  "bg-cyan-50",
] as const;

function thumbBackgroundClass(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i) * (i + 1)) % 997;
  return THUMB_BACKGROUNDS[h % THUMB_BACKGROUNDS.length] ?? "bg-slate-50";
}

function starterTaskCount(t: TemplateLike): number {
  if ("isBuiltIn" in t && t.isBuiltIn) return t.taskCount;
  return t.seedTasks?.length ?? 0;
}

type TemplateCenterCardProps = {
  template: TemplateLike;
  showGovernedBadge: boolean;
  onUse: () => void;
};

export function TemplateCenterCard({
  template,
  showGovernedBadge,
  onUse,
}: TemplateCenterCardProps): ReactElement {
  const tasks = starterTaskCount(template);
  const thumbBg = thumbBackgroundClass(template.id);
  const description =
    template.description?.trim() || "A standard template for your team.";

  return (
    <div
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-lg"
      onClick={onUse}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onUse();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div
        className={`relative flex h-[140px] shrink-0 items-center justify-center ${thumbBg}`}
      >
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
          <LayoutTemplate
            className="h-10 w-10 text-slate-500"
            aria-hidden
            strokeWidth={1.25}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-base font-semibold text-slate-900">
          {template.name}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">by Zephix</p>
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{description}</p>

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="min-w-0 flex-1">
            {showGovernedBadge ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                <Shield className="h-3 w-3 shrink-0 text-amber-700" aria-hidden />
                Governed
              </span>
            ) : (
              <span className="inline-block text-[11px] text-transparent">.</span>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {tasks > 0 ? (
              <span className="text-xs text-slate-400">{tasks} starter tasks</span>
            ) : null}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUse();
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition-all group-hover:border-blue-300 group-hover:bg-blue-50 group-hover:text-blue-800 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
            >
              Use Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
