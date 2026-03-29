import type { InboxAction } from "../types";

type InboxActionBarProps = {
  canMutate: boolean;
  availableActions: InboxAction[];
  pendingAction: InboxAction | null;
  onMarkRead: () => void;
  onLater: () => void;
  onClear: () => void;
  onOpenSource: () => void;
};

export function InboxActionBar({
  canMutate,
  availableActions,
  pendingAction,
  onMarkRead,
  onLater,
  onClear,
  onOpenSource,
}: InboxActionBarProps) {
  const canOpenSource = availableActions.includes("open_source");
  const canMarkRead = canMutate && availableActions.includes("mark_read");
  const canMoveLater = canMutate && availableActions.includes("move_later");
  const canClear = canMutate && availableActions.includes("clear");

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onOpenSource}
        disabled={!canOpenSource || pendingAction !== null}
        className="zs-btn-secondary disabled:opacity-50"
      >
        Open source object
      </button>
      {canMarkRead ? (
        <button
          type="button"
          onClick={onMarkRead}
          disabled={pendingAction !== null}
          className="zs-btn-secondary disabled:opacity-50"
        >
          {pendingAction === "mark_read" ? "Marking..." : "Mark read"}
        </button>
      ) : null}
      {canMoveLater ? (
        <button
          type="button"
          onClick={onLater}
          disabled={pendingAction !== null}
          className="zs-btn-secondary disabled:opacity-50"
        >
          {pendingAction === "move_later" ? "Snoozing..." : "Snooze"}
        </button>
      ) : null}
      {canClear ? (
        <button
          type="button"
          onClick={onClear}
          disabled={pendingAction !== null}
          className="zs-btn-danger disabled:opacity-50"
        >
          {pendingAction === "clear" ? "Clearing..." : "Clear"}
        </button>
      ) : null}
    </div>
  );
}

