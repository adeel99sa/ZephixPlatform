import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { intentColors } from "@/design/tokens";
import { cn } from "@/lib/utils";
import {
  governanceBlockStatusPath,
  listGovernanceBlocks,
  type GovernanceBlockRecord,
} from "@/features/work-management/governanceBlockRecord";

export type GovernanceBlockBannerProps = {
  projectId: string;
  className?: string;
};

function statusLabel(status: GovernanceBlockRecord["exceptionStatus"]): string {
  switch (status) {
    case "CREATED":
      return "PENDING";
    case "PENDING":
      return "PENDING";
    case "APPROVED":
      return "APPROVED";
    case "REJECTED":
      return "REJECTED";
    default:
      return status;
  }
}

export function GovernanceBlockBanner({
  projectId,
  className,
}: GovernanceBlockBannerProps): JSX.Element | null {
  const [blocks, setBlocks] = useState<GovernanceBlockRecord[]>(() =>
    listGovernanceBlocks({ projectId }),
  );

  useEffect(() => {
    const refresh = (): void => {
      setBlocks(listGovernanceBlocks({ projectId }));
    };
    refresh();
    window.addEventListener("governance-block:changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("governance-block:changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [projectId]);

  if (blocks.length === 0) return null;

  return (
    <div
      className={cn("space-y-2", className)}
      data-testid="governance-block-banner"
      role="region"
      aria-label="Active governance blocks"
    >
      {blocks.map((block) => {
        const href = governanceBlockStatusPath(block);
        return (
          <aside
            key={block.id}
            className={cn(
              "rounded-lg border px-4 py-3 text-sm",
              intentColors.danger.border,
              intentColors.danger.bg,
              intentColors.danger.text,
            )}
            data-testid={`governance-block-card-${block.id}`}
            aria-live="polite"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
                  <span>Action blocked</span>
                  <span
                    className="rounded border border-current/20 bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    data-testid={`governance-block-status-${block.id}`}
                  >
                    {statusLabel(block.exceptionStatus)}
                  </span>
                </div>
                <p data-testid={`governance-block-action-${block.id}`}>
                  <span className="font-medium">Blocked:</span> {block.blockedAction}
                </p>
                <p data-testid={`governance-block-policy-${block.id}`}>
                  <span className="font-medium">Policy:</span> {block.policyName}
                </p>
                <p data-testid={`governance-block-reason-${block.id}`}>
                  <span className="font-medium">Reason:</span> {block.reason}
                </p>
                <p data-testid={`governance-block-required-${block.id}`}>
                  <span className="font-medium">Required to clear:</span>{" "}
                  {block.requiredToClear}
                </p>
                <p data-testid={`governance-block-waiting-${block.id}`}>
                  <span className="font-medium">Waiting on:</span> {block.waitingOn}
                </p>
              </div>
              <Link
                to={href}
                className="shrink-0 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                data-testid={`governance-block-view-status-${block.id}`}
              >
                View status
              </Link>
            </div>
          </aside>
        );
      })}
    </div>
  );
}
