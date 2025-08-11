import React from "react";
import { cn } from "../../utils/cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ variant = "primary", className, ...props }: Props) {
  return (
    <button
      className={cn(
        variant === "primary" ? "btn-primary" : "btn-secondary",
        "focus-visible:outline-none",
        className
      )}
      {...props}
    />
  );
}
