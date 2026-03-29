import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

interface EmptyStateFullProps {
  icon: LucideIcon;
  iconSize?: "sm" | "md" | "lg";
  headline: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  suggestion?: string;
  visual?: "simple" | "elevated";
  className?: string;
}

interface EmptyStateLegacyProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

type EmptyStateProps = EmptyStateFullProps | EmptyStateLegacyProps;

function isFullProps(p: EmptyStateProps): p is EmptyStateFullProps {
  return "headline" in p && "icon" in p;
}

export function EmptyState(props: EmptyStateProps) {
  if (isFullProps(props)) {
    const {
      icon: Icon,
      iconSize = "lg",
      headline,
      description,
      primaryAction,
      secondaryAction,
      suggestion,
      visual = "elevated",
      className,
    } = props;

    const iconSizes = {
      sm: "w-8 h-8",
      md: "w-12 h-12",
      lg: "w-16 h-16",
    };

    const containerPaddings = {
      sm: "p-6",
      md: "p-8",
      lg: "p-12",
    };

    const ActionButton = ({ a, variant }: { a: EmptyStateAction; variant: "primary" | "secondary" }) => {
      const base =
        "inline-flex items-center justify-center rounded-md font-medium transition-all duration-[var(--z-duration-fast)] ease-spring h-10 px-4 text-sm disabled:opacity-50 disabled:pointer-events-none";
      const primaryClasses =
        "bg-[var(--z-button-primary-bg)] text-[var(--z-button-primary-text)] hover:bg-[var(--z-button-primary-bg-hover)]";
      const secondaryClasses =
        "bg-[var(--z-button-secondary-bg)] text-[var(--z-button-secondary-text)] border border-z-border hover:bg-[var(--z-button-secondary-bg-hover)]";

      const content = a.label;
      if (a.href && !a.disabled) {
        return (
          <a
            href={a.href}
            className={cn(
              base,
              variant === "primary" ? primaryClasses : secondaryClasses
            )}
          >
            {content}
          </a>
        );
      }
      return (
        <button
          type="button"
          onClick={a.onClick}
          disabled={a.disabled}
          className={cn(
            base,
            variant === "primary" ? primaryClasses : secondaryClasses
          )}
        >
          {content}
        </button>
      );
    };

    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center text-center w-full",
          containerPaddings[iconSize],
          visual === "elevated" &&
            "bg-z-bg-elevated rounded-xl border border-z-border",
          className
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-xl bg-z-bg-sunken mb-6",
            iconSize === "lg" && "p-4",
            iconSize === "md" && "p-3",
            iconSize === "sm" && "p-2"
          )}
        >
          <Icon className={cn(iconSizes[iconSize], "text-z-text-tertiary")} />
        </div>

        <h3 className="text-lg font-semibold text-z-text-primary tracking-tight">
          {headline}
        </h3>

        {description && (
          <p className="mt-2 text-sm text-z-text-secondary max-w-sm leading-relaxed">
            {description}
          </p>
        )}

        {(primaryAction || secondaryAction) && (
          <div className="flex items-center gap-4 mt-6">
            {primaryAction && (
              <ActionButton a={primaryAction} variant="primary" />
            )}
            {secondaryAction && (
              <ActionButton a={secondaryAction} variant="secondary" />
            )}
          </div>
        )}

        {suggestion && (
          <p className="mt-6 text-xs text-z-text-tertiary flex items-center justify-center gap-1">
            <span className="font-medium text-z-text-brand">Pro tip:</span>
            {suggestion}
          </p>
        )}
      </div>
    );
  }

  /* Legacy API: title, description, action */
  const { title, description, action, className } = props;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center w-full p-8 rounded-xl border border-z-border bg-z-bg-elevated",
        className
      )}
    >
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-z-bg-sunken">
        <span className="text-sm font-semibold text-z-text-tertiary">i</span>
      </div>
      <h3 className="text-lg font-semibold text-z-text-primary">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-z-text-secondary max-w-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
