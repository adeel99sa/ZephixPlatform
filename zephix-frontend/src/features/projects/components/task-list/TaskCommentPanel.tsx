import { Button } from '@/components/ui/Button';
import type { TaskComment } from './types';

interface Props {
  taskId: string;
  comments: TaskComment[];
  newComment: string;
  posting: boolean;
  canEdit: boolean;
  getUserLabel: (userId?: string | null) => string;
  onNewCommentChange: (taskId: string, value: string) => void;
  onAddComment: (taskId: string) => void;
}

export function TaskCommentPanel({
  taskId, comments, newComment, posting, canEdit,
  getUserLabel, onNewCommentChange, onAddComment,
}: Props) {
  return (
    <div className="mt-3 pt-3 border-t">
      <h4 className="text-sm font-medium mb-2">Comments</h4>
      <div className="space-y-2 mb-3">
        {comments.map((comment) => (
          <div key={comment.id} className="text-sm bg-gray-50 p-2 rounded">
            <div className="font-medium text-gray-700">
              {getUserLabel(comment.authorUserId)}
            </div>
            <div className="text-gray-600 mt-1">{comment.body}</div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(comment.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => onNewCommentChange(taskId, e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 border rounded-md text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onAddComment(taskId);
              }
            }}
          />
          <Button
            onClick={() => onAddComment(taskId)}
            disabled={!newComment.trim() || posting}
            className="text-sm"
          >
            {posting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      )}
    </div>
  );
}