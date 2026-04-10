import { Bell } from "lucide-react";

export default function AdministrationNotificationsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure organization-wide notification policies and channels.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
          <Bell className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Notifications — Coming Soon</h2>
        <p className="text-sm text-gray-500 max-w-md">
          Configure organization-wide notification policies. Control which events trigger notifications and through which channels.
        </p>
        <span className="mt-4 inline-flex items-center rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 px-3 py-1 text-xs font-medium text-blue-700">
          On the roadmap
        </span>
      </div>
    </div>
  );
}
