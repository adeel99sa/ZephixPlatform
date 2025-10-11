import { CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface ActionItem {
  id: string;
  type: 'pending_invitation' | 'workspace_approval' | 'role_assignment' | 'system_alert';
  title: string;
  description: string;
  count?: number;
  priority: 'high' | 'medium' | 'low';
  action: { label: string; href: string };
}

interface AdminActionItemsProps {
  items: ActionItem[];
}

export function AdminActionItems({ items }: AdminActionItemsProps) {
  if (items.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-medium text-gray-500 mb-4">
          Admin action items
        </h2>
        <div className="p-6 rounded-lg border border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800">No pending actions</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-medium text-gray-500 mb-4">
        Admin action items
      </h2>
      <div className="space-y-3">
        {items.map(item => (
          <ActionItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function ActionItemCard({ item }: { item: ActionItem }) {
  const priorityColors = {
    high: 'border-red-200 bg-red-50',
    medium: 'border-yellow-200 bg-yellow-50',
    low: 'border-gray-200 bg-gray-50'
  };

  return (
    <div className={`p-4 rounded-lg border ${priorityColors[item.priority]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{item.title}</h3>
            {item.count && (
              <Badge variant="secondary">{item.count}</Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          href={item.action.href}
        >
          {item.action.label}
        </Button>
      </div>
    </div>
  );
}

function Badge({ variant, children }: { variant: 'secondary'; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      {children}
    </span>
  );
}




