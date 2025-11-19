import React from "react";

import { cn } from "../../utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ variant = "primary", className, ...props }: Props) {
  const variantClasses = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300",
  };

  return (
    <button
      type={props.type || "button"}
      className={cn(
        variantClasses[variant],
        "focus-visible:outline-none",
        className
      )}
      {...props}
    />
  );
}
