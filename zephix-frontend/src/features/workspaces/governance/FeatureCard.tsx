import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/components/Button";

export interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: string;
  editable?: boolean;
  locked?: boolean;
  tooltip?: string;
  limit?: string;
  /** When provided, wired to the action button onClick */
  onAction?: () => void;
  /** Phase 1 demo: when provided for locked cards, shows "Try remove" link to test validation */
  onTryRemove?: () => void;
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  action,
  editable,
  locked,
  tooltip,
  limit,
  onAction,
  onTryRemove,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border p-4",
        locked
          ? "border-z-border bg-z-bg-sunken"
          : "border-z-border bg-z-bg-elevated hover:border-z-border-strong"
      )}
    >
      {locked && (
        <div className="absolute right-2 top-2" title={tooltip}>
          <Lock size={14} className="text-z-text-tertiary" />
        </div>
      )}

      <div className="mb-2 flex items-center gap-3">
        <div
          className={cn(
            "rounded-lg p-2",
            locked ? "bg-z-bg-elevated" : "bg-blue-50"
          )}
        >
          <Icon
            size={18}
            className={locked ? "text-z-text-tertiary" : "text-blue-600"}
          />
        </div>
        <h4
          className={cn(
            "font-medium",
            locked ? "text-z-text-secondary" : "text-z-text-primary"
          )}
        >
          {title}
        </h4>
      </div>

      <p className="mb-3 text-sm text-z-text-secondary">{description}</p>

      {limit && <p className="mb-2 text-xs text-z-text-tertiary">{limit}</p>}

      {!locked && action && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={onAction}
        >
          {action}
        </Button>
      )}

      {locked && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-z-text-tertiary">
            <Lock size={12} />
            Required
          </div>
          {onTryRemove && (
            <button
              type="button"
              onClick={onTryRemove}
              className="text-xs text-z-text-tertiary hover:text-z-text-brand underline"
            >
              Try remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}
