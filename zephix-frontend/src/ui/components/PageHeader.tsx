import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderCompoundProps {
  children: React.ReactNode;
  variant?: "default" | "compact" | "transparent";
  className?: string;
}

interface PageHeaderLegacyProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  variant?: "default" | "compact" | "transparent";
  className?: string;
}

type PageHeaderProps = PageHeaderCompoundProps | PageHeaderLegacyProps;

function isLegacyProps(
  p: PageHeaderProps
): p is PageHeaderLegacyProps {
  return "title" in p && typeof p.title === "string";
}

interface PageHeaderSectionProps {
  children: React.ReactNode;
  className?: string;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  (props, ref) => {
    const { variant = "default", className } = props;

    if (isLegacyProps(props)) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex items-center justify-between w-full",
            "px-8 py-6",
            "border-b border-z-border",
            "bg-z-bg-elevated",
            variant === "compact" && "py-4 px-6",
            variant === "transparent" && "bg-transparent border-transparent",
            className
          )}
        >
          <div className="flex items-center gap-4 flex-1 min-w-0" />
          <div className="flex-1 flex justify-center px-4">
            <div className="flex flex-col items-center text-center">
              <PageTitle>{props.title}</PageTitle>
              {props.subtitle && (
                <PageSubtitle>{props.subtitle}</PageSubtitle>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 flex-1 justify-end min-w-0">
            {props.actions ?? null}
          </div>
        </div>
      );
    }

    const { children } = props;
    const childArray = React.Children.toArray(children);
    const left = childArray[0];
    const center = childArray[1];
    const right = childArray[2];

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between w-full",
          "px-8 py-6",
          "border-b border-z-border",
          "bg-z-bg-elevated",
          variant === "compact" && "py-4 px-6",
          variant === "transparent" && "bg-transparent border-transparent",
          className
        )}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {left}
        </div>
        <div className="flex-1 flex justify-center px-4">
          {center}
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end min-w-0">
          {right}
        </div>
      </div>
    );
  }
);
PageHeader.displayName = "PageHeader";

const PageHeaderLeft = ({ children, className }: PageHeaderSectionProps) => (
  <div className={cn("flex items-center gap-2", className)}>{children}</div>
);

const PageHeaderCenter = ({ children, className }: PageHeaderSectionProps) => (
  <div className={cn("flex flex-col items-center text-center", className)}>
    {children}
  </div>
);

const PageHeaderRight = ({ children, className }: PageHeaderSectionProps) => (
  <div className={cn("flex items-center gap-4", className)}>{children}</div>
);

const PageTitle = React.forwardRef<
  HTMLHeadingElement,
  { children: React.ReactNode; className?: string }
>(({ children, className }, ref) => (
  <h1
    ref={ref}
    className={cn(
      "text-xl font-semibold tracking-tight text-z-text-primary",
      className
    )}
  >
    {children}
  </h1>
));
PageTitle.displayName = "PageTitle";

const PageSubtitle = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-z-text-secondary mt-1">{children}</p>
);

export {
  PageHeader,
  PageHeaderLeft,
  PageHeaderCenter,
  PageHeaderRight,
  PageTitle,
  PageSubtitle,
};
