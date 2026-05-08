import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/state/AuthContext";

const STORAGE_KEY = "zephix.mfaLogin";

type MfaPending = {
  mfaToken: string;
  email?: string;
};

function readPending(): MfaPending | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MfaPending;
    if (!parsed || typeof parsed.mfaToken !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function safeReturnUrl(v: string | null) {
  if (!v) return null;
  if (!v.startsWith("/")) return null;
  if (v.startsWith("//")) return null;
  return v;
}

export default function MfaChallengePage() {
  const { completeMfaLogin } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const params = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const returnUrl = safeReturnUrl(params.get("returnUrl"));

  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pending = readPending();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!pending?.mfaToken) {
      setErr("MFA session expired. Sign in again.");
      return;
    }
    const trimmed = code.trim();
    if (!trimmed) {
      setErr("Enter the verification code from your authenticator app.");
      return;
    }
    setSubmitting(true);
    try {
      await completeMfaLogin({ mfaToken: pending.mfaToken, code: trimmed });
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      nav(returnUrl || "/inbox", { replace: true });
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setErr(ax?.response?.data?.message || ax?.message || "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!pending) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4 text-center">
          <p className="text-sm text-gray-700">No MFA challenge is active. Sign in to continue.</p>
          <Link className="text-indigo-600 text-sm font-medium" to="/login">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Verify your identity</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter the six-digit code from your authenticator app
            {pending.email ? (
              <>
                {" "}
                for <span className="font-medium text-gray-800">{pending.email}</span>
              </>
            ) : null}
            .
          </p>
        </div>

        {err ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {err}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="mfa-code" className="text-sm font-medium text-gray-700">
              Authentication code
            </label>
            <input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="mt-1 w-full rounded border border-gray-300 p-2 tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-indigo-600 text-white py-2 disabled:opacity-50"
          >
            {submitting ? "Verifying…" : "Continue"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          <Link to="/login">Cancel and return to sign in</Link>
        </p>
      </div>
    </div>
  );
}
