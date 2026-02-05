interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
  className?: string;
}

export function Alert({ children, variant = "default", className = "" }: AlertProps) {
  const variants: Record<'default' | 'destructive', string> = {
    default: "bg-blue-50 text-blue-900 border-blue-200",
    destructive: "bg-red-50 text-red-900 border-red-200"
  };
  return (
    <div className={`p-4 rounded-lg border ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}

export function AlertDescription({ children }: any) {
  return <div className="text-sm">{children}</div>;
}
