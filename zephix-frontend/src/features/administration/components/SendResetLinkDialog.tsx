/**
 * AUTH-1F — admin-generated password reset link handoff.
 *
 * Security: the reset URL is shown only inside this modal. Never toast it,
 * never console-log it, never auto-copy — copy requires an explicit click.
 */
import { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import { Modal } from "@/components/ui/overlay/Modal";
import { Button } from "@/components/ui/button/Button";
import { administrationApi } from "@/features/administration/api/administration.api";

const HONEST_COPY =
  "This link expires in 1 hour and can be used once. Share it directly with the user — email delivery is not enabled yet.";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userLabel?: string | null;
};

function mapResetLinkError(err: unknown): string {
  const ax = err as { response?: { status?: number; data?: { message?: string } } };
  const status = ax?.response?.status;
  if (status === 403) {
    return "You can only generate reset links for people in your organization.";
  }
  if (status === 404) {
    return "That user was not found. They may have been removed from the organization.";
  }
  return "Could not generate a reset link. Try again.";
}

export function SendResetLinkDialog({ isOpen, onClose, userId, userLabel }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setResetLink(null);
    setCopied(false);

    void (async () => {
      try {
        const result = await administrationApi.generateUserResetLink(userId);
        if (cancelled) return;
        setResetLink(result.resetLink);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(mapResetLinkError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, userId]);

  function handleClose() {
    setLoading(false);
    setError(null);
    setResetLink(null);
    setCopied(false);
    onClose();
  }

  async function handleCopy() {
    if (!resetLink) return;
    try {
      await navigator.clipboard.writeText(resetLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const title = userLabel ? `Reset link for ${userLabel}` : "Password reset link";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="md">
      <div className="space-y-4">
        {loading ? (
          <div
            className="flex items-center gap-2 text-sm text-gray-600"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Generating reset link…
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && resetLink ? (
          <>
            <p className="text-sm text-gray-600">{HONEST_COPY}</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={resetLink}
                aria-label="Password reset link"
                className="min-w-0 flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-900"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button type="button" variant="outline" onClick={() => void handleCopy()}>
                {copied ? (
                  <>
                    <Check className="mr-1 h-4 w-4" aria-hidden />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-4 w-4" aria-hidden />
                    Copy
                  </>
                )}
              </Button>
            </div>
            {copied ? (
              <p className="text-xs text-gray-500" aria-live="polite">
                Link copied to clipboard.
              </p>
            ) : null}
          </>
        ) : null}

        <div className="flex justify-end pt-1">
          <Button type="button" variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export const SEND_RESET_LINK_HONEST_COPY = HONEST_COPY;
