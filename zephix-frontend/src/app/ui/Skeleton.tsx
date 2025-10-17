export function SkeletonRow() {
  return (
    <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
