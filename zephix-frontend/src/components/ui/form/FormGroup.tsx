import React from 'react';
import { cn } from '@/lib/utils';

export interface FormGroupProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  legend?: string;
  description?: string;
  children: React.ReactNode;
}

const FormGroup = React.forwardRef<HTMLFieldSetElement, FormGroupProps>(
  ({ className, legend, description, children, ...props }, ref) => {
    const descriptionId = React.useId();

    return (
      <fieldset ref={ref} className={cn("space-y-4", className)} {...props}>
        {legend && (
          <legend className="text-sm font-medium leading-none">
            {legend}
          </legend>
        )}
        {description && (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        <div className="space-y-4">
          {children}
        </div>
      </fieldset>
    );
  }
);
FormGroup.displayName = "FormGroup";

export { FormGroup };
