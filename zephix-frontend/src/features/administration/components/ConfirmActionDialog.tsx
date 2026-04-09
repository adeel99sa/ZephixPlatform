/**
 * ConfirmActionDialog — Admin Console MVP-2.
 *
 * Reusable compact dialog for governance actions that previously used
 * `window.prompt()`. Replaces reject-with-reason, request-info-with-question,
 * and approve-with-optional-comment patterns across AdministrationOverviewPage
 * and AdministrationGovernancePage.
 *
 * Uses the existing Modal component from `components/ui/overlay/Modal`.
 */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/overlay/Modal";

interface ConfirmActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** When set, shows a textarea for user input. */
  inputLabel?: string;
  inputPlaceholder?: string;
  /** When true, the textarea must have content before the user can confirm. */
  inputRequired?: boolean;
  confirmLabel?: string;
  /** "destructive" renders the confirm button in red. */
  confirmVariant?: "default" | "destructive";
  onConfirm: (inputValue: string) => void | Promise<void>;
}

export function ConfirmActionDialog({
  isOpen,
  onClose,
  title,
  description,
  inputLabel,
  inputPlaceholder,
  inputRequired = false,
  confirmLabel = "Confirm",
  confirmVariant = "default",
  onConfirm,
}: ConfirmActionDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset when dialog opens.
  const handleClose = () => {
    setInputValue("");
    setIsSubmitting(false);
    onClose();
  };

  async function handleConfirm() {
    if (inputRequired && !inputValue.trim()) return;
    setIsSubmitting(true);
    try {
      await onConfirm(inputValue.trim());
      handleClose();
    } catch {
      // Let the caller handle errors; just stop the spinner.
      setIsSubmitting(false);
    }
  }

  const canSubmit = !isSubmitting && (!inputRequired || inputValue.trim().length > 0);

  const confirmBtnClass =
    confirmVariant === "destructive"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-indigo-600 text-white hover:bg-indigo-700";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <div className="space-y-4">
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}

        {inputLabel && (
          <div>
            <label
              htmlFor="confirm-action-input"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {inputLabel}
              {inputRequired && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </label>
            <textarea
              id="confirm-action-input"
              rows={3}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${confirmBtnClass}`}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
