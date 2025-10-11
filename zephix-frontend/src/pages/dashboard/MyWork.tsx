import { CheckSquare, Calendar, TrendingUp } from 'lucide-react';

export function MyWork() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Work</h1>
          <p className="text-sm text-gray-600 mt-1">
            Tasks assigned to you across all projects
          </p>
        </div>
      </div>

      {/* Placeholder Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">To Do</span>
          </div>
          <div className="text-3xl font-semibold text-gray-900">0</div>
        </div>
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-600">In Progress</span>
          </div>
          <div className="text-3xl font-semibold text-gray-900">0</div>
        </div>
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Due This Week</span>
          </div>
          <div className="text-3xl font-semibold text-gray-900">0</div>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <CheckSquare className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No tasks assigned yet
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Tasks assigned to you will appear here
        </p>
        <div className="text-xs text-gray-500">
          Coming in Week 2 Day 3 - Task assignment system
        </div>
      </div>
    </div>
  );
}

