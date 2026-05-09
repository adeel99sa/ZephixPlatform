import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Shield, Home } from 'lucide-react';

function copyForReason(reason: string | null): { body: string; hint: string } {
  switch (reason) {
    case 'need_workspace_owner':
      return {
        body: "Workspace owners can manage workspace members and certain settings. If you need that access, ask a workspace owner in your organization.",
        hint: "You can still use workspaces where you have member access from Inbox and Work.",
      };
    case 'need_org_admin':
    default:
      return {
        body: "You need administrator access to open this area. Contact your organization administrator if you believe you should have access.",
        hint: "Members and viewers can continue from Inbox without administrator permissions.",
      };
  }
}

export const Forbidden: React.FC = () => {
  const [params] = useSearchParams();
  const reason = params.get('reason');
  const { body, hint } = useMemo(() => copyForReason(reason), [reason]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" data-testid="forbidden-page">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Shield className="mx-auto h-12 w-12 text-red-400" aria-hidden />
        <h1 className="mt-4 text-3xl font-bold text-gray-900">403</h1>
        <h2 className="mt-2 text-xl font-semibold text-gray-700">Access Forbidden</h2>
        <p className="mt-2 text-sm text-gray-600">{body}</p>
        <p className="mt-3 text-xs text-gray-500">{hint}</p>
        <div className="mt-6">
          <Link
            to="/inbox"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Home className="w-4 h-4 mr-2" aria-hidden />
            Back to Inbox
          </Link>
        </div>
      </div>
    </div>
  );
};
