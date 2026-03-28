import React from 'react';
import { LucideIcon, FolderOpen } from 'lucide-react';

export type EmptyStateVariant = 'default' | 'projects' | 'tasks' | 'inbox' | 'members';

interface EmptyStateCardProps {
  /** Title shown in bold */
  title: string;
  /** Description text */
  description: string;
  /** Lucide icon to display */
  icon?: LucideIcon;
  /** Primary action button (admin/owner) */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Read-only message for non-admin users (shown when action is not provided) */
  readOnlyMessage?: string;
  /** Visual variant — affects icon and color accent */
  variant?: EmptyStateVariant;
}

const VARIANT_COLORS: Record<EmptyStateVariant, string> = {
  default: 'bg-gray-100 text-gray-500',
  projects: 'bg-indigo-100 text-indigo-600',
  tasks: 'bg-blue-100 text-blue-600',
  inbox: 'bg-amber-100 text-amber-600',
  members: 'bg-purple-100 text-purple-600',
};

/**
 * Empty state card — consistent empty state across the app.
 * Shows icon, title, description, and either an action button (admin)
 * or a read-only message (member/viewer).
 */
export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  title,
  description,
  icon: Icon = FolderOpen,
  action,
  readOnlyMessage,
  variant = 'default',
}) => (
  <div
    className="flex flex-col items-center justify-center py-12 px-6 text-center"
    data-testid="empty-state-card"
    data-variant={variant}
  >
    <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${VARIANT_COLORS[variant]}`}>
      <Icon className="h-6 w-6" />
    </div>

    <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
    <p className="text-xs text-gray-500 max-w-xs mb-4">{description}</p>

    {action ? (
      <button
        onClick={action.onClick}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        data-testid="empty-state-action"
      >
        {action.label}
      </button>
    ) : readOnlyMessage ? (
      <p className="text-xs text-gray-400 italic" data-testid="empty-state-readonly">
        {readOnlyMessage}
      </p>
    ) : null}
  </div>
);
