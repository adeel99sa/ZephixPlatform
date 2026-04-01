import { Button } from '@/components/ui/Button';
import type { WorkspaceMember } from './types';

interface Props {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  creating: boolean;
  workspaceMembers: WorkspaceMember[];
}

export function TaskCreateForm({ onSubmit, onCancel, creating, workspaceMembers }: Props) {
  return (
    <form onSubmit={onSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            required
            className="w-full px-3 py-2 border rounded-md"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            rows={2}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assignee
            </label>
            <select name="assigneeId" className="w-full px-3 py-2 border rounded-md">
              <option value="">Unassigned</option>
              {workspaceMembers.map((member) => {
                const user = member.user || { id: member.userId, email: 'Unknown' };
                const displayName = user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.email;
                return (
                  <option key={member.userId} value={member.userId}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input type="date" name="dueDate" className="w-full px-3 py-2 border rounded-md" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={creating}>
            Cancel
          </Button>
          <Button type="submit" disabled={creating}>
            {creating ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </div>
    </form>
  );
}