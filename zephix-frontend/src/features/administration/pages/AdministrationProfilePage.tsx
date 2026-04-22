import { useAuth } from "@/state/AuthContext";
import { platformRoleFromUser } from "@/utils/roles";

/**
 * Account profile (self-service) — reachable at `/administration/profile`.
 * Replaces the legacy `/settings` stub; lives under the main app shell (not the admin-only console layout).
 */
export default function AdministrationProfilePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Loading profile…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const role = platformRoleFromUser(user);
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold text-slate-900">My profile</h1>
      <p className="mt-1 text-sm text-slate-600">
        Account details for your Zephix user. Organization and security administration remain in the
        Administration console when you have access.
      </p>

      <dl className="mt-8 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-1 gap-1 px-4 py-4 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm font-medium text-slate-500">Name</dt>
          <dd className="text-sm text-slate-900 sm:col-span-2">{displayName}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1 px-4 py-4 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm font-medium text-slate-500">Email</dt>
          <dd className="text-sm text-slate-900 sm:col-span-2">{user.email}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1 px-4 py-4 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm font-medium text-slate-500">Role</dt>
          <dd className="text-sm text-slate-900 sm:col-span-2">{role}</dd>
        </div>
      </dl>
    </div>
  );
}
