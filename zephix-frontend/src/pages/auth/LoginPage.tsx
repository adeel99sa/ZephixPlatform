import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";

import { request } from "@/lib/api";
import { useAuth } from "@/state/AuthContext";
import { defaultPostLoginPath } from "@/utils/postLoginPath";

function safeReturnUrl(v: string | null) {
  if (!v) return null;
  if (!v.startsWith("/")) return null;
  if (v.startsWith("//")) return null;
  return v;
}

const MFA_STORAGE_KEY = "zephix.mfaLogin";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const params = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const returnUrl = safeReturnUrl(params.get("returnUrl"));
  const sessionExpired = params.get("reason") === "session_expired";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setEmailNotVerified(false);
    setResendMessage(null);
    setSubmitting(true);
    try {
      const outcome = await login(email, password);
      if (!outcome.ok) {
        try {
          sessionStorage.setItem(
            MFA_STORAGE_KEY,
            JSON.stringify({ challengeToken: outcome.challengeToken, email: email.trim().toLowerCase() }),
          );
        } catch {
          // ignore
        }
        const qs = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : "";
        nav(`/login/mfa-challenge${qs}`, { replace: true });
        return;
      }
      // MP-3: platform MEMBER lands on My Work; admin (and others) keep Inbox.
      // Do not call authenticated APIs here: a 401 → refresh failure in `api.ts`
      // triggers `window.location.assign("/login")`, which full-reloads and clears
      // in-memory JWTs (cross-site cookie mode), reproducing "instant kick out".
      nav(returnUrl || defaultPostLoginPath(outcome.user), { replace: true });
    } catch (e: any) {
      const code = e?.response?.data?.code;
      if (code === "EMAIL_NOT_VERIFIED") {
        setEmailNotVerified(true);
        setErr(null);
      } else if (code === "ACCOUNT_LOCKED") {
        const until = e?.response?.data?.lockedUntil || e?.response?.data?.cooldownUntil;
        setErr(
          typeof until === "string"
            ? `This account is temporarily locked. Try again after ${until}.`
            : "This account is temporarily locked. Try again later.",
        );
      } else {
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "Sign in failed";
        setErr(String(msg));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendVerification() {
    if (resendCooldown || !email) return;
    setResendMessage(null);
    try {
      await request.post("/auth/resend-verification", { email });
      setResendMessage("Verification email sent. Please check your inbox.");
      setResendCooldown(true);
      setTimeout(() => setResendCooldown(false), 60000);
    } catch (e: any) {
      if (e?.response?.status === 429) {
        setResendMessage("Too many requests. Please wait before trying again.");
      } else {
        setResendMessage("If an account with this email exists, you will receive a verification email.");
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <div className="text-2xl font-semibold">Enterprise Secure Sign In</div>
          <div className="text-sm text-gray-500">
            Or <Link className="text-blue-600" to="/signup">create a new enterprise account</Link>
          </div>
        </div>

        {sessionExpired && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Your session ended. Please sign in again to continue.
          </div>
        )}

        {err && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {emailNotVerified && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              Verify your email to continue
            </p>
            <p className="mt-1 text-sm text-amber-700">
              We sent a verification link to <strong>{email}</strong>. Please check your inbox and click the link to activate your account.
            </p>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendCooldown}
              className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {resendCooldown ? "Resend available in 60s" : "Resend verification email"}
            </button>
            {resendMessage && (
              <p className="mt-2 text-xs text-gray-600">{resendMessage}</p>
            )}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block" htmlFor="login-email">
              Email address
            </label>
            <input
              id="login-email"
              className="w-full rounded border p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              type="email"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium" htmlFor="login-password">
                Password
              </label>
              <Link className="text-xs text-blue-600 hover:underline" to="/forgot-password">
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              className="w-full rounded border p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-indigo-600 text-white py-2 disabled:opacity-50"
          >
            {submitting ? "Signing in" : "Sign In Securely"}
          </button>
        </form>
      </div>
    </div>
  );
}
