/**
 * Reusable dashboard card container for workspace dashboard.
 * Pass 1: shell with title, loading, empty state.
 * Pass 3: hover action bar, full-screen support.
 */
import { useState } from "react";
import { CardActionBar, type CardActionBarProps } from "./CardActionBar";

export interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  /** Pass 3: card ID for action wiring */
  cardId?: string;
  /** Pass 3: action bar props (omit to hide actions) */
  actions?: Omit<CardActionBarProps, "visible">;
}

export function DashboardCard({
  title,
  children,
  icon,
  className = "",
  actions,
}: DashboardCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`group/card flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        {icon && <span className="text-slate-400">{icon}</span>}
        <h3 className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{title}</h3>
        {/* Action bar — reserved space so layout doesn't shift */}
        {actions && (
          <div className="shrink-0">
            <CardActionBar visible={hovered} {...actions} />
          </div>
        )}
      </div>
      <div className="flex-1 px-5 py-4 min-h-[180px]">{children}</div>
    </div>
  );
}

export function CardLoading() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-2/3 rounded bg-slate-100" />
      <div className="h-4 w-1/2 rounded bg-slate-100" />
      <div className="h-4 w-3/4 rounded bg-slate-100" />
    </div>
  );
}

export function CardEmpty({ message }: { message: string }) {
  return (
    <div className="flex min-h-[100px] items-center justify-center">
      <p className="text-center text-sm leading-relaxed text-slate-400">{message}</p>
    </div>
  );
}
