import React from 'react';
import { cn } from '@/lib/utils';

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  help?: string;
  error?: string;
  options: RadioOption[];
  name: string;
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, help, error, options, name, id, ...props }, ref) => {
    const radioId = id || React.useId();
    const helpId = React.useId();
    const errorId = React.useId();

    return (
      <div className="space-y-2">
        {label && (
          <fieldset>
            <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {label}
            </legend>
            <div className="mt-2 space-y-2">
              {options.map((option, index) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    className={cn(
                      "h-4 w-4 border border-primary text-primary ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                      error && "border-destructive focus:ring-destructive",
                      className
                    )}
                    id={`${radioId}-${index}`}
                    name={name}
                    value={option.value}
                    disabled={option.disabled}
                    aria-describedby={error ? errorId : help ? helpId : undefined}
                    aria-invalid={!!error}
                    {...props}
                  />
                  <label
                    htmlFor={`${radioId}-${index}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        )}
        {help && !error && (
          <p id={helpId} className="text-sm text-muted-foreground">
            {help}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Radio.displayName = "Radio";

export { Radio };
