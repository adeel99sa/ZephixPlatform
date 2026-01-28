import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";

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

  const [email, setEmail] = useState("admin@zephix.ai");
  const [password, setPassword] = useState("admin123456");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await login(email, password);
      nav(returnUrl || "/home", { replace: true });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Sign in failed";
      setErr(String(msg));
    } finally {
      setSubmitting(false);
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
