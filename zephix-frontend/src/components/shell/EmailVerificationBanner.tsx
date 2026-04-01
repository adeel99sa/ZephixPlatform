import { useState } from "react";
import { useAuth } from "@/state/AuthContext";
import { apiClient } from "@/lib/api/client";
import { Mail, X } from "lucide-react";

/**
 * Persistent banner for unverified users.
 * Does not block product access — only gates sensitive outbound actions.
 * Includes resend with 60-second cooldown.
 */
export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Don't show if no user, verified, or banner collapsed
  if (!user || user.emailVerified !== false) return null;
  if (collapsed) return null;

  async function handleResend() {
    if (resending || cooldown > 0) return;
    setResending(true);
    try {
      await apiClient.post("/auth/resend-verification");
      setResent(true);
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      // Silent — neutral response per security spec
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-amber-800">
          <Mail className="h-4 w-4 shrink-0" />
          <span>
            Please verify your email ({user.email}) to unlock invites and sharing.
          </span>
          {resent ? (
            <span className="text-amber-600 text-xs">
              Sent!{cooldown > 0 ? ` Resend in ${cooldown}s` : ""}
            </span>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="text-amber-700 underline hover:text-amber-900 disabled:opacity-50 text-xs"
            >
              {resending ? "Sending..." : "Resend verification email"}
            </button>
          )}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-amber-400 hover:text-amber-600 ml-2"
          title="Dismiss for now"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
