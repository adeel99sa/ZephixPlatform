export function ErrorBanner({
  title = "Something went wrong",
  detail,
  onRetry,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{title}</p>
          {detail && <p className="mt-1 text-red-700">{detail}</p>}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
