import { FolderKanban, Archive, Search } from 'lucide-react';

export default function AdminArchivePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Archive</h1>
        <p className="text-gray-500 mt-1">View and manage archived workspaces, projects, and items</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <Archive className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500 mb-2">No archived items</p>
        <p className="text-sm text-gray-400">
          Archived workspaces, projects, and items will appear here. You can restore them or permanently delete them.
        </p>
      </div>
    </div>
  );
}
