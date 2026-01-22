import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="p-6" data-testid="admin-notifications-root">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Notifications
        </h1>
        <p className="text-gray-600 mt-2">
          Configure organization-wide notification settings and preferences.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
        <div className="text-center py-12">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Notification Settings
          </h3>
          <p className="text-gray-600 mb-4">
            Organization notification preferences and email settings will be available here.
          </p>
          <p className="text-sm text-gray-500">
            TODO: Implement notification preferences UI and backend integration
          </p>
        </div>
      </div>
    </div>
  );
}


















