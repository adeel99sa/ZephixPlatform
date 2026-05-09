import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Zap, CheckCircle, XCircle, Loader } from "lucide-react";

import { previewInvitation, acceptInvitation } from "@/features/auth/invitations.api";
import { useAuth } from "@/state/AuthContext";
import { getApiErrorMessage } from "@/utils/apiErrorMessage";

type Phase = "loading-preview" | "preview" | "accepting" | "success" | "error" | "unavailable";

export const InviteAcceptPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, bootstrapSessionFromTokens, refreshMe } = useAuth();

  const token = searchParams.get("token")?.trim() ?? "";

  const [phase, setPhase] = useState<Phase>("loading-preview");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewInvitation>> | null>(null);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!token) {
      setPhase("error");
      setMessage("Invitation token is missing.");
      return;
    }

    let cancelled = false;
    (async () => {
      setPhase("loading-preview");
      try {
        const p = await previewInvitation(token);
        if (cancelled) return;
        setPreview(p);
        setPhase("preview");
      } catch (err: unknown) {
        if (cancelled) return;
        const ax = err as { response?: { data?: { code?: string; message?: string }; status?: number } };
        const st = ax?.response?.status;
        if (st === 404 || st === 503) {
          setPhase("unavailable");
          setMessage("Invitation acceptance is not available yet. Try again after your administrator finishes rollout.");
          return;
        }
        setPhase("error");
        setMessage(getApiErrorMessage(ax?.response?.data) || "Could not load this invitation.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAcceptLoggedIn() {
    if (!token) return;
    setPhase("accepting");
    setMessage("");
    try {
      const result = await acceptInvitation(token, {});
      if (result.status === 201) {
        await bootstrapSessionFromTokens(result.data.accessToken, result.data.refreshToken);
        setPhase("success");
        setMessage("Welcome! Redirecting…");
        window.setTimeout(() => navigate("/inbox", { replace: true }), 1500);
        return;
      }
      await refreshMe();
      setPhase("success");
      setMessage("You have joined the organization. Redirecting…");
      window.setTimeout(() => navigate("/inbox", { replace: true }), 1500);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { code?: string; message?: string }; status?: number } };
      setPhase("preview");
      setMessage(getApiErrorMessage(ax?.response?.data) || "Could not accept invitation.");
    }
  }

  async function handleAcceptNewUser(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const name = fullName.trim();
    if (!name || password.length < 8) {
      setMessage("Enter your full name and a password of at least 8 characters.");
      return;
    }
    setPhase("accepting");
    try {
      const result = await acceptInvitation(token, { fullName: name, password });
      if (result.status !== 201) {
        setPhase("preview");
        setMessage("Unexpected response from server. Try again or contact support.");
        return;
      }
      const { accessToken, refreshToken } = result.data;
      await bootstrapSessionFromTokens(accessToken, refreshToken);
      setPhase("success");
      setMessage("Welcome! Your account is ready. Redirecting…");
      window.setTimeout(() => navigate("/inbox", { replace: true }), 1500);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { code?: string; message?: string }; status?: number } };
      setPhase("preview");
      setMessage(getApiErrorMessage(ax?.response?.data) || "Could not accept invitation.");
    }
  }

  if (!token) {
    return (
      <InviteShell>
        <ErrorBlock title="Invitation incomplete" message={message} />
      </InviteShell>
    );
  }

  if (phase === "loading-preview") {
    return (
      <InviteShell>
        <LoadingBlock title="Loading invitation…" subtitle="Please wait." />
      </InviteShell>
    );
  }

  if (phase === "unavailable") {
    return (
      <InviteShell>
        <ErrorBlock title="Not available" message={message} />
      </InviteShell>
    );
  }

  if (phase === "error" && !preview) {
    return (
      <InviteShell>
        <ErrorBlock title="Invitation" message={message} />
      </InviteShell>
    );
  }

  if (phase === "success") {
    return (
      <InviteShell>
        <div className="text-center py-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" aria-hidden />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Success</h3>
          <p className="mt-2 text-sm text-gray-500">{message}</p>
        </div>
      </InviteShell>
    );
  }

  if (preview && (phase === "preview" || phase === "accepting" || (phase === "error" && preview))) {
    return (
      <InviteShell>
        <div className="py-6 text-left space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">You&apos;re invited</h3>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-medium text-gray-800">{preview.orgName}</span>
              {preview.workspaceName ? (
                <>
                  {" "}
                  · Workspace <span className="font-medium text-gray-800">{preview.workspaceName}</span>
                </>
              ) : null}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              <span className="text-gray-500">Email:</span> {preview.email}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              <span className="text-gray-500">Role:</span> {preview.invitedRole}
            </p>
            <p className="mt-1 text-xs text-gray-400">Expires {new Date(preview.expiresAt).toLocaleString()}</p>
          </div>

          {message && phase === "preview" ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {message}
            </div>
          ) : null}

          {user ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Signed in as {user.email}. Accept this invitation for your account.</p>
              <button
                type="button"
                disabled={phase === "accepting"}
                onClick={() => void handleAcceptLoggedIn()}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {phase === "accepting" ? "Accepting…" : "Accept invitation"}
              </button>
              <p className="text-xs text-gray-500 text-center">
                Wrong account?{" "}
                <Link to="/login" className="text-indigo-600 hover:text-indigo-500">
                  Sign out and switch
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleAcceptNewUser} className="space-y-4">
              <p className="text-sm text-gray-600">
                Create your account to join. Already have an account?{" "}
                <Link
                  to={`/login?returnUrl=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`}
                  className="text-indigo-600 hover:text-indigo-500"
                >
                  Sign in
                </Link>
              </p>
              <div>
                <label htmlFor="invite-full-name" className="block text-sm font-medium text-gray-700">
                  Full name
                </label>
                <input
                  id="invite-full-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(ev) => setFullName(ev.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="invite-password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="invite-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={phase === "accepting"}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {phase === "accepting" ? "Creating account…" : "Accept and create account"}
              </button>
            </form>
          )}
        </div>
      </InviteShell>
    );
  }

  return (
    <InviteShell>
      <ErrorBlock title="Something went wrong" message={message || "Try again later."} />
    </InviteShell>
  );
};

function InviteShell({ children }: { children: React.ReactNode }) {
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
        <div className="bg-white py-4 px-4 shadow sm:rounded-lg sm:px-10">{children}</div>
      </div>
    </div>
  );
}

function LoadingBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
        <Loader className="h-6 w-6 text-indigo-600 animate-spin" aria-hidden />
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

function ErrorBlock({ title, message }: { title: string; message: string }) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <XCircle className="h-6 w-6 text-red-600" aria-hidden />
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{message}</p>
      <div className="mt-6">
        <Link
          to="/login"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
