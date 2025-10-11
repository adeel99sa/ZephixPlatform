import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Clock, FolderIcon } from 'lucide-react';

// Extend dayjs with relativeTime plugin
dayjs.extend(relativeTime);

interface RecentItem {
  id: string;
  name: string;
  type: 'workspace' | 'project' | 'document';
  icon?: string;
  lastAccessed: Date;
  lastEditor?: { name: string; avatar: string };
}

interface RecentlyVisitedProps {
  items: RecentItem[];
}

export function RecentlyVisited({ items }: RecentlyVisitedProps) {
  if (items.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-medium text-gray-500 mb-4">
          Recently visited
        </h2>
        <EmptyState
          icon={Clock}
          title="No recent activity"
          description="Your recently accessed workspaces and projects will appear here"
        />
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-medium text-gray-500 mb-4">
        Recently visited
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <RecentItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function RecentItemCard({ item }: { item: RecentItem }) {
  return (
    <Link
      to={`/${item.type}s/${item.id}`}
      className="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
          {item.icon ? (
            <span className="text-xl">{item.icon}</span>
          ) : (
            <FolderIcon className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {dayjs(item.lastAccessed).fromNow()}
          </p>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}
