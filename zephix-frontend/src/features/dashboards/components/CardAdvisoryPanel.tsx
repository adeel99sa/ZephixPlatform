import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getCardAdvisory } from "../api";
import type { CardAdvisoryResponse } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  cardKey: string;
  workspaceId: string;
};

export function CardAdvisoryPanel({
  open,
  onClose,
  cardKey,
  workspaceId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advisory, setAdvisory] = useState<CardAdvisoryResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getCardAdvisory({
          cardKey,
          workspaceId,
        });
        if (!cancelled) {
          setAdvisory(result);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load advisory.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, cardKey, workspaceId]);

  async function handleRetry() {
    try {
      setLoading(true);
      setError(null);
      const result = await getCardAdvisory({ cardKey, workspaceId });
      setAdvisory(result);
    } catch (err: any) {
      setError(err?.message || "Failed to load advisory.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-end bg-black/20">
      <div className="h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-[var(--zs-shadow-modal)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">Card Advisory</h3>
          <button
            onClick={onClose}
            className="zs-icon-btn"
            aria-label="Close advisory panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && <p className="text-sm text-slate-600">Loading advisory...</p>}
        {error && (
          <div className="zs-state-error text-sm">
            <p>{error}</p>
            <button
              className="zs-btn-danger mt-2 px-2 py-1 text-xs"
              onClick={() => void handleRetry()}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && advisory && (
          <div className="space-y-4">
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Summary
              </h4>
              <p className="mt-1 text-sm text-slate-800">{advisory.summary}</p>
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Drivers
              </h4>
              {advisory.drivers.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">No advisory available.</p>
              ) : (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-800">
                  {advisory.drivers.map((driver, idx) => (
                    <li key={`${idx}-${driver}`}>{driver}</li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Affected Entities
              </h4>
              {advisory.visibilityScope === "viewer_restricted" ? (
                <p className="mt-1 text-sm text-slate-600">
                  Redacted for visibility policy. {advisory.affectedEntityCount} affected
                  entit{advisory.affectedEntityCount === 1 ? "y" : "ies"} in scope.
                </p>
              ) : advisory.affectedEntities.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">No named entities in scope.</p>
              ) : (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-800">
                  {advisory.affectedEntities.map((entity) => (
                    <li key={`${entity.type}:${entity.id}`}>
                      {entity.name} ({entity.type})
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Recommended Actions
              </h4>
              {advisory.recommendedActions.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">No recommended actions.</p>
              ) : (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-800">
                  {advisory.recommendedActions.map((action, idx) => (
                    <li key={`${idx}-${action}`}>{action}</li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-xs text-slate-500">
              Generated from: {advisory.generatedFromTimestamp || "N/A"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

