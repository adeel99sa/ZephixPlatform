import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { api } from "@/lib/api";

function safeReturnUrl(v: string | null) {
  if (!v) return null;
  if (!v.startsWith("/")) return null;
  if (v.startsWith("//")) return null;
  return v;
}

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const params = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const returnUrl = safeReturnUrl(params.get("returnUrl"));

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
      await login(email, password);
      const wsResp = await api.get("/workspaces");
      const workspaces = wsResp?.data?.data || wsResp?.data || [];
      if (Array.isArray(workspaces) && workspaces.length > 0) {
        const slug = workspaces[0].slug;
        nav(returnUrl || `/w/${slug}/home`, { replace: true });
      } else {
        nav("/setup/workspace", { replace: true });
      }
    } catch (e: any) {
      const code = e?.response?.data?.code;
      if (code === "EMAIL_NOT_VERIFIED" || e?.response?.status === 403) {
        setEmailNotVerified(true);
        setErr(null);
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
      await api.post("/auth/resend-verification", { email });
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
            <div className="text-sm font-medium mb-1">Email address</div>
            <input
              className="w-full rounded border p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Password</div>
            <input
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
