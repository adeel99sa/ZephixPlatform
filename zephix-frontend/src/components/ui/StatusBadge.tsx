export function StatusBadge({ onDark = true }: { onDark?: boolean }) {
  return onDark ? (
    <div 
      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80" 
      role="status" 
      aria-label="Private beta"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary-600)]"></span>
      Private beta
    </div>
  ) : (
    <div 
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary-600)] bg-[var(--primary-50)] px-2.5 py-1 text-xs font-medium text-[var(--primary-600)]" 
      role="status" 
      aria-label="Private beta"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary-600)]"></span>
      Private beta
    </div>
  );
}
