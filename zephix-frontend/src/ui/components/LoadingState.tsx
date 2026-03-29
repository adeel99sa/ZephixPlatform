type LoadingStateProps = {
  message?: string;
  className?: string;
};

export function LoadingState({
  message = "Loading...",
  className = "",
}: LoadingStateProps) {
  return (
    <div className={`flex min-h-[240px] items-center justify-center ${className}`}>
      <div className="zs-state max-w-sm text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
        <h3 className="text-sm font-semibold text-slate-800">Loading</h3>
        <p className="mt-1 text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}

