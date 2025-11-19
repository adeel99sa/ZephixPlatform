import { useAuth } from "@/state/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold">
            {user?.firstName?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unknown User" : "Unknown User"}
            </h2>
            <p className="text-gray-600">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              {user?.role || "viewer"}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={user?.firstName || ""}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={user?.lastName || ""}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
