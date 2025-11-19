import { useAiPanelState } from '@/state/aiPanel';
import { track } from '@/lib/telemetry';

export function AiToggleButton() {
  const { open, setOpen } = useAiPanelState();

  return (
    <button
      type="button"
      aria-pressed={open}
      aria-label="Toggle AI Assistant"
      data-testid="ai-toggle"
      onClick={() => {
        const next = !open;
        setOpen(next);
        track('ui.ai.toggle', { open: next });
      }}
      className={`rounded-md px-2 py-1 focus:outline-none focus:ring-2 ${open ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'}`}
    >
      AI
    </button>
  );
}
