import { UsersRound } from "lucide-react";

export default function AdministrationTeamsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Teams</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create and manage teams, departments, and cross-functional groups.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
          <UsersRound className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Teams — Coming Soon</h2>
        <p className="text-sm text-gray-500 max-w-md">
          Organize your people into teams and departments. Assign teams to workspaces and projects for streamlined access management.
        </p>
        <span className="mt-4 inline-flex items-center rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 px-3 py-1 text-xs font-medium text-blue-700">
          On the roadmap
        </span>
      </div>
    </div>
  );
}
