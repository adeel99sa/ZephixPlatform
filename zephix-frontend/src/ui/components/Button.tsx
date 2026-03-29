import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium",
          "transition-all duration-z-fast ease-spring",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-z-blue-500/50",
          "disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" && [
            "bg-[var(--z-button-primary-bg)] text-[var(--z-button-primary-text)]",
            "hover:bg-[var(--z-button-primary-bg-hover)]",
            "shadow-sm hover:shadow-md",
          ],
          variant === "secondary" && [
            "bg-[var(--z-button-secondary-bg)] text-[var(--z-button-secondary-text)]",
            "border border-z-border",
            "hover:bg-[var(--z-button-secondary-bg-hover)]",
          ],
          variant === "ghost" && [
            "text-z-text-secondary hover:text-z-text-primary",
            "hover:bg-z-bg-hover",
          ],
          variant === "danger" && [
            "bg-red-600 text-white hover:bg-red-700",
          ],
          size === "sm" && "h-8 px-3 text-xs gap-2",
          size === "md" && "h-10 px-4 text-sm gap-2",
          size === "lg" && "h-12 px-6 text-base gap-3",
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
