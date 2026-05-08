import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  disableMfa,
  getMfaStatus,
  startMfaEnrollment,
  verifyMfaEnrollment,
} from "@/lib/auth/auth.api";
import { isPlatformAdmin } from "@/utils/access";
import type { AuthUserLike } from "@/lib/auth/auth.types";

type Props = {
  user: AuthUserLike | null;
};

export function MfaSection({ user }: Props) {
  const [status, setStatus] = useState<{ enrolled: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl?: string; qrCodeDataUrl?: string } | null>(
    null,
  );
  const [verifyCode, setVerifyCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [busy, setBusy] = useState(false);

  const requireAdminBanner = isPlatformAdmin(user);

  async function refreshStatus() {
    setLoading(true);
    try {
      const s = await getMfaStatus();
      setStatus(s);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function beginEnrollment() {
    setBusy(true);
    try {
      const res = await startMfaEnrollment();
      if (!res) {
        toast.error("MFA enrollment is not available on this server yet.");
        return;
      }
      setSetup(res);
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
      await refreshStatus();
    } catch {
      toast.error("Verification failed. Check the code and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onDisable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await disableMfa({ password: disablePassword });
      toast.success("MFA disabled.");
      setDisablePassword("");
      await refreshStatus();
    } catch {
      toast.error("Could not disable MFA. Confirm your password.");
    } finally {
      setBusy(false);
    }
  }

  const enrolled = status?.enrolled === true;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Multi-factor authentication</h2>
      <p className="mt-1 text-sm text-gray-500">
        Add a second factor for sensitive actions. Use an authenticator app that supports TOTP codes.
      </p>

      {requireAdminBanner ? (
        <div
          className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          MFA is required for organization administrators before performing sensitive administration tasks.
        </div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Checking MFA status…</p>
      ) : status === null ? (
        <p className="mt-4 text-sm text-gray-600">
          MFA management is not available until the identity service exposes `/auth/mfa/*` endpoints.
        </p>
      ) : enrolled ? (
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
                alt="MFA QR code"
                className="mt-2 h-44 w-44 rounded border border-gray-200 bg-white p-2"
              />
            </div>
          ) : null}
          <div>
            <p className="text-sm font-medium text-gray-900">Manual entry key</p>
            <p className="mt-1 font-mono text-sm text-gray-800 break-all">{setup.secret}</p>
            {setup.otpauthUrl ? (
              <p className="mt-2 text-xs text-gray-500 break-all">
                Authenticator URI (advanced): {setup.otpauthUrl}
              </p>
            ) : null}
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
