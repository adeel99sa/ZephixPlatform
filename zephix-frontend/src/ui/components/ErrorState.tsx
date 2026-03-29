type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div className={`zs-state-error ${className}`}>
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm font-semibold text-rose-700">
        !
      </div>
      <h3 className="text-base font-semibold text-rose-700">{title}</h3>
      <p className="mt-1 text-sm text-rose-700">{description}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="zs-btn-danger mt-3"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

