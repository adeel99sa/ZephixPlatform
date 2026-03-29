type DetailSidePanelProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function DetailSidePanel({
  open,
  title,
  onClose,
  children,
}: DetailSidePanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <button
        className="flex-1 bg-black/30"
        onClick={onClose}
        aria-label="Close details panel"
      />
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-[var(--zs-shadow-modal)]">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="zs-btn-secondary px-2 py-1 text-sm"
          >
            Close
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}

