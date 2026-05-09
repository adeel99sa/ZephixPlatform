import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Zap, CheckCircle } from "lucide-react";

import { resetPasswordWithToken } from "@/lib/auth/auth.api";
import { getApiErrorMessage } from "@/utils/apiErrorMessage";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Reset link is missing a token. Open the link from your email.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPasswordWithToken({ token, password });
      setDone(true);
      window.setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { code?: string; message?: string }; status?: number } };
      const st = ax?.response?.status;
      const data = ax?.response?.data;
      if (st === 404 || st === 503) {
        setError("Password reset is not available on this server yet. Try again later.");
      } else {
        setError(getApiErrorMessage(data) || "Could not reset password.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">ZEPHIX</span>
          </Link>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {done ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" aria-hidden />
              </div>
              <h1 className="mt-4 text-lg font-medium text-gray-900">Password updated</h1>
              <p className="mt-2 text-sm text-gray-500">Redirecting you to sign in…</p>
              <p className="mt-4 text-sm">
                <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Go to sign in now
                </Link>
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-medium text-gray-900">Choose a new password</h1>
              <p className="mt-2 text-sm text-gray-500">Enter a new password for your account.</p>

              {error ? (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </div>
              ) : null}

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700">
                    New password
                  </label>
                  <input
                    id="reset-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="reset-password-confirm" className="block text-sm font-medium text-gray-700">
                    Confirm password
                  </label>
                  <input
                    id="reset-password-confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(ev) => setConfirm(ev.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !token}
                  className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Saving…" : "Update password"}
                </button>
              </form>
            </>
          )}

          {!done ? (
            <p className="mt-6 text-center text-sm text-gray-600">
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Back to sign in
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
