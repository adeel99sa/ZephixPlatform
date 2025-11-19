import { ReactNode } from 'react';
import { Save, Plus, RefreshCw } from 'lucide-react';

interface AdminPageScaffoldProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  onSave?: () => void;
  onRefresh?: () => void;
  saving?: boolean;
  loading?: boolean;
}

export default function AdminPageScaffold({
  title,
  description,
  actions,
  children,
  onSave,
  onRefresh,
  saving = false,
  loading = false,
}: AdminPageScaffoldProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {description && <p className="text-gray-500 mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
          {actions}
          {onSave && (
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        children
      )}
    </div>
  );
}

