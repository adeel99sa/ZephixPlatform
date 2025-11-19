import { useEffect, useRef } from 'react';
import { useAiPanelState } from '@/state/aiPanel';

export function AiAssistantPanel() {
  const { open, setOpen } = useAiPanelState();
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <aside
      aria-label="AI Assistant"
      className="fixed right-0 top-12 z-40 h-[calc(100vh-3rem)] w-[360px] border-l border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
      data-testid="ai-panel"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium">AI Assistant</h2>
        <button
          ref={closeBtn}
          onClick={() => setOpen(false)}
          className="rounded-md px-2 py-1 hover:bg-neutral-100 focus:outline-none focus:ring-2"
        >
          Close
        </button>
      </div>
      <div className="text-sm text-neutral-600 dark:text-neutral-300">
        (placeholder) Ask me about dashboards, projects, risks, or capacity.
      </div>
    </aside>
  );
}
