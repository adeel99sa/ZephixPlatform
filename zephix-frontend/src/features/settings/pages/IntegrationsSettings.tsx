import type { ReactElement } from "react";

import { SettingsPageHeader } from "../components/ui";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type CardStatus = "connect" | "coming_soon";

type IntegrationCard = {
  id: string;
  name: string;
  status: CardStatus;
};

const CARDS: IntegrationCard[] = [
  { id: "jira", name: "Jira", status: "connect" },
  { id: "github", name: "GitHub", status: "connect" },
  { id: "slack", name: "Slack", status: "connect" },
  { id: "salesforce", name: "Salesforce", status: "coming_soon" },
];

function IntegrationCardView({ card }: { card: IntegrationCard }): ReactElement {
  const { name, status } = card;
  return (
    <article
      className={cn(
        "flex flex-col rounded-lg border p-5 shadow-sm",
        status === "connect" && "border-slate-200 bg-white",
        status === "coming_soon" &&
          "border-dashed border-slate-300 bg-slate-100/50 text-slate-500",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{name}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {status === "coming_soon"
              ? "Planned connector."
              : "Not connected from this screen — preview layout only."}
          </p>
        </div>
        {status === "coming_soon" ? (
          <span className="shrink-0 rounded-full border border-dashed border-slate-300 bg-white/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Planned
          </span>
        ) : null}
      </div>
      <div className="mt-4">
        {status === "connect" ? (
          <Button
            type="button"
            variant="primary"
            className="w-full font-semibold sm:w-auto"
            onClick={() => {
              /* UI only — no OAuth */
            }}
          >
            Preview connect
          </Button>
        ) : null}
        {status === "coming_soon" ? (
          <Button
            type="button"
            variant="outline"
            disabled
            className="w-full !cursor-not-allowed !opacity-100 border-dashed border-slate-300 bg-slate-50 text-slate-500 sm:w-auto"
          >
            Coming soon
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export default function IntegrationsSettings(): ReactElement {
  return (
    <div data-settings-integrations>
      <SettingsPageHeader
        title="Integrations"
        description="Preview connectors only — no OAuth and no live connection from this screen."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <IntegrationCardView key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
