import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { enrollMfa, verifyMfaEnrollment, disableMfa } from "@/lib/auth/auth.api";
import { isPlatformAdmin } from "@/utils/access";
import type { AuthUserLike } from "@/lib/auth/auth.types";
import { useAuth } from "@/state/AuthContext";
import { getApiErrorMessage } from "@/utils/apiErrorMessage";

type Props = {
  user: AuthUserLike | null;
};

function formatGroupedKey(key: string): string {
  const cleaned = key.replace(/\s/g, "").toUpperCase();
  if (!cleaned) return "";
  return cleaned.match(/.{1,4}/g)?.join(" ") ?? cleaned;
}

function graceDaysRemaining(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const ms = t - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function MfaSection({ user }: Props) {
  const { refreshMe } = useAuth();
  const [setup, setSetup] = useState<{ qrCodeDataUrl: string; manualEntryKey: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [busy, setBusy] = useState(false);

  const requireAdminBanner = isPlatformAdmin(user);
  const graceDays = graceDaysRemaining(user?.mfaGracePeriodEndsAt ?? null);

  const enrolled = user?.mfaEnrolled === true;

  useEffect(() => {
    setSetup(null);
    setVerifyCode("");
  }, [enrolled]);

  const graceCopy = useMemo(() => {
    if (graceDays == null) return null;
    if (graceDays <= 0) return null;
    return `Your organization encourages administrators to turn on MFA. You have ${graceDays} day${graceDays === 1 ? "" : "s"} left in the enrollment grace period.`;
  }, [graceDays]);

  async function beginEnrollment() {
    setBusy(true);
    try {
      const res = await enrollMfa();
      setSetup({
        qrCodeDataUrl: res.qrCodeDataUrl,
        manualEntryKey: res.manualEntryKey || res.secret,
      });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { code?: string; message?: string }; status?: number } };
      const st = ax?.response?.status;
      if (st === 404 || st === 503) {
        toast.error("MFA enrollment is not available on this server yet.");
        return;
      }
      toast.error(getApiErrorMessage(ax?.response?.data) || "Could not start MFA enrollment.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEnrollment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await verifyMfaEnrollment(verifyCode.trim());
      toast.success("MFA enabled.");
      setSetup(null);
      setVerifyCode("");
      await refreshMe();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { code?: string; message?: string } } };
      toast.error(getApiErrorMessage(ax?.response?.data) || "Verification failed. Check the code and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onDisable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await disableMfa({ currentPassword: disablePassword });
      toast.success("MFA disabled.");
      setDisablePassword("");
      await refreshMe();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { code?: string; message?: string } } };
      toast.error(getApiErrorMessage(ax?.response?.data) || "Could not disable MFA. Confirm your password.");
    } finally {
      setBusy(false);
    }
  }

  async function copyManualKey() {
    const raw = setup?.manualEntryKey ?? "";
    if (!raw) return;
    try {
      await navigator.clipboard.writeText(raw.replace(/\s/g, ""));
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Could not copy.");
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Multi-factor authentication</h2>
      <p className="mt-1 text-sm text-gray-500">
        Add a second factor for sensitive actions. Use an authenticator app that supports TOTP codes.
      </p>

      {graceCopy ? (
        <div
          className="mt-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
          role="status"
        >
          {graceCopy}
        </div>
      ) : null}

      {requireAdminBanner && !graceCopy ? (
        <div
          className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800"
          role="status"
        >
          As an organization administrator, enabling MFA helps protect your organization when you manage people and
          settings.
        </div>
      ) : null}

      {enrolled ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm font-medium text-green-800">MFA is enabled on your account.</p>
          <form onSubmit={onDisable} className="max-w-md space-y-3">
            <div>
              <label htmlFor="mfa-disable-password" className="block text-sm font-medium text-gray-700">
                Confirm password to disable MFA
              </label>
              <input
                id="mfa-disable-password"
                type="password"
                autoComplete="current-password"
                required
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {busy ? "Disabling…" : "Disable MFA"}
            </button>
          </form>
        </div>
      ) : setup ? (
        <div className="mt-6 space-y-4">
          {setup.qrCodeDataUrl ? (
            <div>
              <p className="text-sm font-medium text-gray-900">Scan QR code</p>
              <img
                src={setup.qrCodeDataUrl}
                alt="QR code for MFA setup"
                className="mt-2 h-44 w-44 rounded border border-gray-200 bg-white p-2"
              />
            </div>
          ) : null}
          <div>
            <p className="text-sm font-medium text-gray-900">Manual entry key</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm tracking-wide text-gray-900">
                {formatGroupedKey(setup.manualEntryKey)}
              </code>
              <button
                type="button"
                onClick={() => void copyManualKey()}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Copy
              </button>
            </div>
          </div>
          <form onSubmit={verifyEnrollment} className="max-w-md space-y-3">
            <div>
              <label htmlFor="mfa-verify-code" className="block text-sm font-medium text-gray-700">
                Verification code
              </label>
              <input
                id="mfa-verify-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? "Verifying…" : "Verify and enable"}
              </button>
              <button type="button" className="text-sm text-gray-600 hover:text-gray-900" onClick={() => setSetup(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="mt-6">
          <button
            type="button"
            disabled={busy}
            onClick={() => void beginEnrollment()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start MFA enrollment"}
          </button>
        </div>
      )}
    </section>
  );
}
