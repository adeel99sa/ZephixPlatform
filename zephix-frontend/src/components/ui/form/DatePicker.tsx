import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  help?: string;
  error?: string;
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, help, error, id, ...props }, ref) => {
    const inputId = id || React.useId();
    const helpId = React.useId();
    const errorId = React.useId();

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type="date"
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            id={inputId}
            ref={ref}
            aria-describedby={error ? errorId : help ? helpId : undefined}
            aria-invalid={!!error}
            {...props}
          />
          <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
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
DatePicker.displayName = "DatePicker";

export { DatePicker };
