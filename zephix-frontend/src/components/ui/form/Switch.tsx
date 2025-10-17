import React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  help?: string;
  error?: string;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, help, error, id, ...props }, ref) => {
    const switchId = id || React.useId();
    const helpId = React.useId();
    const errorId = React.useId();

    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only peer"
              id={switchId}
              ref={ref}
              aria-describedby={error ? errorId : help ? helpId : undefined}
              aria-invalid={!!error}
              {...props}
            />
            <label
              htmlFor={switchId}
              className={cn(
                "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                "peer-checked:bg-primary peer-focus:ring-primary",
                error && "peer-focus:ring-destructive",
                className
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
                  "peer-checked:translate-x-5"
                )}
              />
            </label>
          </div>
          {label && (
            <label
              htmlFor={switchId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {label}
            </label>
          )}
        </div>
        {help && !error && (
          <p id={helpId} className="text-sm text-muted-foreground ml-14">
            {help}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-sm text-destructive ml-14">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
