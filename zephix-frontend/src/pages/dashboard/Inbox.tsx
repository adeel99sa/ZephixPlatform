import { Mail, Filter, Search } from 'lucide-react';

export function Inbox() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inbox</h1>
          <p className="text-sm text-gray-600 mt-1">
            Notifications, mentions, and updates
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Mail className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No notifications yet
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          You'll see mentions, comments, and updates here
        </p>
        <div className="text-xs text-gray-500">
          Coming in Week 3 - Notification system
        </div>
      </div>
    </div>
  );
}

