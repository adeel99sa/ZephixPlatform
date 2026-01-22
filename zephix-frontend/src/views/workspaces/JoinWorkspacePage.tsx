import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { workspaceInvitesApi, type ApiError } from '@/features/workspaces/api/workspace-invite.api';
import { useAuth } from '@/state/AuthContext';

type State =
  | { status: 'boot'; token: string | null; error: ApiError | null }
  | { status: 'missing-token'; token: null; error: ApiError }
  | { status: 'joining'; token: string; error: null }
  | { status: 'success'; token: string; workspaceId: string; error: null }
  | { status: 'error'; token: string; error: ApiError };

function parseToken(search: string): string | null {
  const qs = new URLSearchParams(search);
  const t = qs.get('token');
  return t && t.trim().length > 0 ? t.trim() : null;
}

export default function JoinWorkspacePage() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, loading } = useAuth();

  const token = useMemo(() => parseToken(loc.search), [loc.search]);
  const [state, setState] = useState<State>({ status: 'boot', token, error: null });

  useEffect(() => {
    setState({ status: 'boot', token, error: null });
  }, [token]);

  useEffect(() => {
    if (loading) return;

    if (!token) {
      setState({
        status: 'missing-token',
        token: null,
        error: { code: 'MISSING_TOKEN', message: 'Invite token is missing', statusCode: 400 },
      });
      return;
    }

    if (!user) {
      // Login page currently ignores returnUrl. Store it and pass query param.
      const returnUrl = `${loc.pathname}${loc.search}`;
      localStorage.setItem('zephix.returnUrl', returnUrl);
      nav(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
      return;
    }

    let alive = true;

    (async () => {
      setState({ status: 'joining', token, error: null });

      try {
        const res = await workspaceInvitesApi.joinWorkspace({ token });
        if (!alive) return;
        setState({ status: 'success', token, workspaceId: res.workspaceId, error: null });
        nav(`/workspaces/${res.workspaceId}/home`, { replace: true });
      } catch (e) {
        if (!alive) return;
        const err = e as ApiError;

        if (err.statusCode === 401 || err.code === 'UNAUTHENTICATED') {
          const returnUrl = `${loc.pathname}${loc.search}`;
          localStorage.setItem('zephix.returnUrl', returnUrl);
          nav(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
          return;
        }

        // Treat already-member as success if backend provides workspaceId in message later.
        setState({ status: 'error', token, error: err });
      }
    })();

    return () => {
      alive = false;
    };
  }, [loading, user, token, nav, loc.pathname, loc.search]);

  const title =
    state.status === 'joining'
      ? 'Joining workspace...'
      : state.status === 'missing-token'
        ? 'Invalid invite link'
        : state.status === 'error'
          ? 'Join failed'
          : 'Join workspace';

  const message =
    state.status === 'missing-token'
      ? state.error.message
      : state.status === 'error'
        ? state.error.message || 'Unable to join workspace'
        : 'Please wait';

  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-2 text-sm text-slate-600">{message}</div>

        {state.status === 'error' && state.error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            Code: {state.error.code || 'UNKNOWN'}
          </div>
        ) : null}
      </div>
    </div>
  );
}
