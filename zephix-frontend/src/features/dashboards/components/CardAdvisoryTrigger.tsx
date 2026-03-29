import { useState } from "react";
import { Sparkles } from "lucide-react";
import { CardAdvisoryPanel } from "./CardAdvisoryPanel";

type Props = {
  cardKey: string;
  workspaceId: string;
};

export function CardAdvisoryTrigger({ cardKey, workspaceId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="zs-btn-ghost px-2 py-1 text-xs text-blue-700"
        data-testid={`advisory-trigger-${cardKey}`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Explain
      </button>
      <CardAdvisoryPanel
        open={open}
        onClose={() => setOpen(false)}
        cardKey={cardKey}
        workspaceId={workspaceId}
      />
    </>
  );
}

