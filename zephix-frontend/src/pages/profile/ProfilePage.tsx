import { useAuth } from "@/state/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Loading profile...
        </div>
      </div>
    );
  }

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U";

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="rounded-lg border border-slate-200 bg-white p-5">
          <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
          <p className="mt-1 text-sm text-slate-600">Personal account identity and access context.</p>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {`${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown User"}
              </p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded border border-slate-200 px-3 py-2">
              <p className="text-xs text-slate-500">First name</p>
              <p className="text-sm text-slate-900">{user.firstName || "—"}</p>
            </div>
            <div className="rounded border border-slate-200 px-3 py-2">
              <p className="text-xs text-slate-500">Last name</p>
              <p className="text-sm text-slate-900">{user.lastName || "—"}</p>
            </div>
            <div className="rounded border border-slate-200 px-3 py-2 md:col-span-2">
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-sm text-slate-900">{user.email}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
