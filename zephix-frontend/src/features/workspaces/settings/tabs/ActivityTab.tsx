interface ActivityTabProps {
  workspaceId: string;
}

export default function ActivityTab({ workspaceId }: ActivityTabProps) {
  return (
    <div data-testid="ws-settings-activity-root">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Workspace Activity</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-sm text-gray-500">
          Activity log will show changes to members, roles, settings, and other workspace events.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          {/* TODO: Implement activity log */}
        </p>
      </div>
    </div>
  );
}















