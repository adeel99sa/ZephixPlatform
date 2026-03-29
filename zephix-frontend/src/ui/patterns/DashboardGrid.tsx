import { cn } from "@/lib/utils";

type DashboardGridProps = {
  children: React.ReactNode;
  className?: string;
};

export function DashboardGrid({ children, className }: DashboardGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3", className)}>
      {children}
    </div>
  );
}

type DashboardCardProps = {
  title: string;
  actions?: React.ReactNode;
  explainTrigger?: React.ReactNode;
  children: React.ReactNode;
  onDrilldown?: () => void;
};

export function DashboardCard({
  title,
  actions,
  explainTrigger,
  children,
  onDrilldown,
}: DashboardCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--zs-shadow-card)] transition-shadow hover:shadow-md">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight text-slate-800">{title}</h3>
        <div className="flex items-center gap-2">
          {explainTrigger}
          {actions}
        </div>
      </header>
      <div>{children}</div>
      {onDrilldown ? (
        <button
          onClick={onDrilldown}
          className="mt-4 text-xs font-semibold text-blue-700 hover:text-blue-800"
        >
          View details
        </button>
      ) : null}
    </article>
  );
}

