import { Button } from '@/components/ui/Button';
import type { WorkspaceMember, WorkTaskStatus, BulkActionType } from './types';

interface Props {
  selectedCount: number;
  bulkAction: BulkActionType;
  bulkStatus: WorkTaskStatus;
  bulkAssigneeId: string;
  bulkDueDate: string;
  bulkProcessing: boolean;
  loading: boolean;
  isAdmin: boolean;
  workspaceMembers: WorkspaceMember[];
  onSetBulkAction: (action: BulkActionType) => void;
  onSetBulkStatus: (status: WorkTaskStatus) => void;
  onSetBulkAssigneeId: (id: string) => void;
  onSetBulkDueDate: (date: string) => void;
  onBulkUpdate: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export function TaskBulkActions({
  selectedCount, bulkAction, bulkStatus, bulkAssigneeId, bulkDueDate,
  bulkProcessing, loading, isAdmin, workspaceMembers,
  onSetBulkAction, onSetBulkStatus, onSetBulkAssigneeId, onSetBulkDueDate,
  onBulkUpdate, onBulkDelete, onClearSelection,
}: Props) {
  return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">
          {selectedCount} task{selectedCount > 1 ? 's' : ''} selected
        </span>
        <button onClick={onClearSelection} className="text-sm text-gray-600 hover:text-gray-800">
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {bulkAction === null && (
          <>
            <Button onClick={() => onSetBulkAction('status')} variant="ghost" className="text-sm" disabled={bulkProcessing || loading}>Change Status</Button>
            <Button onClick={() => onSetBulkAction('assign')} variant="ghost" className="text-sm" disabled={bulkProcessing || loading}>Assign To</Button>
            <Button onClick={() => onSetBulkAction('dueDate')} variant="ghost" className="text-sm" disabled={bulkProcessing || loading}>Set Due Date</Button>
            <Button onClick={() => onSetBulkAction('clearDueDate')} variant="ghost" className="text-sm" disabled={bulkProcessing || loading}>Clear Due Date</Button>
            <Button onClick={() => onSetBulkAction('unassign')} variant="ghost" className="text-sm" disabled={bulkProcessing || loading}>Unassign</Button>
            {isAdmin && (
              <Button onClick={onBulkDelete} variant="ghost" className="text-sm text-red-600 border-red-300 hover:bg-red-50" disabled={bulkProcessing || loading}>Delete</Button>
            )}
          </>
        )}
        {bulkAction === 'status' && (
          <div className="flex items-center gap-2">
            <select value={bulkStatus} onChange={(e) => onSetBulkStatus(e.target.value as WorkTaskStatus)} className="px-2 py-1 border rounded text-sm">
              <option value="TODO">Todo</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
            <Button onClick={onBulkUpdate} className="text-sm" disabled={bulkProcessing || loading}>{bulkProcessing ? 'Updating...' : 'Update'}</Button>
            <Button onClick={() => onSetBulkAction(null)} variant="ghost" className="text-sm">Cancel</Button>
          </div>
        )}
        {bulkAction === 'assign' && (
          <div className="flex items-center gap-2">
            <select value={bulkAssigneeId} onChange={(e) => onSetBulkAssigneeId(e.target.value)} className="px-2 py-1 border rounded text-sm">
              <option value="">Unassigned</option>
              {workspaceMembers.map((member) => {
                const user = member.user || { id: member.userId, email: 'Unknown' };
                const displayName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email;
                return <option key={member.userId} value={member.userId}>{displayName}</option>;
              })}
            </select>
            <Button onClick={onBulkUpdate} className="text-sm" disabled={bulkProcessing || loading}>{bulkProcessing ? 'Updating...' : 'Update'}</Button>
            <Button onClick={() => onSetBulkAction(null)} variant="ghost" className="text-sm">Cancel</Button>
          </div>
        )}
        {bulkAction === 'dueDate' && (
          <div className="flex items-center gap-2">
            <input type="date" value={bulkDueDate} onChange={(e) => onSetBulkDueDate(e.target.value)} className="px-2 py-1 border rounded text-sm" />
            <Button onClick={onBulkUpdate} className="text-sm" disabled={bulkProcessing || loading}>{bulkProcessing ? 'Updating...' : 'Update'}</Button>
            <Button onClick={() => onSetBulkAction(null)} variant="ghost" className="text-sm">Cancel</Button>
          </div>
        )}
        {(bulkAction === 'clearDueDate' || bulkAction === 'unassign') && (
          <div className="flex items-center gap-2">
            <Button onClick={onBulkUpdate} className="text-sm" disabled={bulkProcessing || loading}>{bulkProcessing ? 'Updating...' : 'Update'}</Button>
            <Button onClick={() => onSetBulkAction(null)} variant="ghost" className="text-sm">Cancel</Button>
          </div>
        )}
      </div>
    </div>
  );
}