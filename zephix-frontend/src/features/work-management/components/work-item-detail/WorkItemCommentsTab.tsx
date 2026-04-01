import { useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2, Pencil, Trash2 } from 'lucide-react';
import type { TaskDetailDto } from '../../api/taskDetail.api';

function formatRelativeTime(d?: string | null): string {
  if (!d) return '';
  const now = Date.now();
  const then = new Date(d).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  detail: TaskDetailDto;
  userId?: string;
  userRole?: string;
  newComment: string;
  posting: boolean;
  editingCommentId: string | null;
  editCommentBody: string;
  onNewCommentChange: (value: string) => void;
  onAddComment: () => void;
  onStartEdit: (commentId: string, body: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (commentId: string) => void;
  onEditBodyChange: (value: string) => void;
  onDeleteComment: (commentId: string) => void;
}

export function WorkItemCommentsTab({
  detail, userId, userRole, newComment, posting,
  editingCommentId, editCommentBody,
  onNewCommentChange, onAddComment, onStartEdit, onCancelEdit, onSaveEdit, onEditBodyChange, onDeleteComment,
}: Props) {
  const commentEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (commentEndRef.current) {
      commentEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [detail.comments.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3">
        {detail.comments.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-8 w-8 mx-auto text-neutral-300 mb-2" />
            <p className="text-sm text-neutral-500">No comments yet</p>
            <p className="text-xs text-neutral-400 mt-1">Start a conversation about this task</p>
          </div>
        ) : (
          [...detail.comments].reverse().map((c) => {
            const author = detail.commentAuthors?.[c.createdByUserId];
            const authorName = author
              ? (author.firstName && author.lastName ? `${author.firstName} ${author.lastName}` : author.email)
              : c.createdByUserId.slice(0, 8) + '...';
            const initials = author
              ? (author.firstName && author.lastName ? `${author.firstName[0]}${author.lastName[0]}` : author.email.slice(0, 2))
              : c.createdByUserId.slice(0, 2);

            const isOwnComment = c.createdByUserId === userId;
            const canModerate = userRole === 'ADMIN' || userRole === 'admin';
            const canEditComment = isOwnComment || canModerate;
            const isEditingThis = editingCommentId === c.id;

            return (
              <div key={c.id} className="group relative" data-testid={`comment-${c.id}`}>
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                    {initials.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-neutral-700 truncate">{authorName}</span>
                      <span className="text-[10px] text-neutral-400" title={new Date(c.createdAt).toLocaleString()}>
                        {formatRelativeTime(c.createdAt)}
                      </span>
                      {c.updatedAt !== c.createdAt && (
                        <span className="text-[10px] text-neutral-400 italic">(edited)</span>
                      )}
                      {canEditComment && !isEditingThis && (
                        <span className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onStartEdit(c.id, c.body)} className="p-0.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600" title="Edit comment">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={() => onDeleteComment(c.id)} className="p-0.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-500" title="Delete comment">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                    </div>
                    {isEditingThis ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={editCommentBody}
                          onChange={(e) => onEditBodyChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSaveEdit(c.id); }
                            if (e.key === 'Escape') onCancelEdit();
                          }}
                          rows={2}
                          className="w-full text-sm border border-indigo-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                          autoFocus
                        />
                        <div className="flex gap-1.5">
                          <button onClick={() => onSaveEdit(c.id)} className="px-2 py-0.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700">Save</button>
                          <button onClick={onCancelEdit} className="px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-800 whitespace-pre-wrap break-words leading-relaxed">{c.body}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={commentEndRef} />
      </div>

      <div className="border-t border-neutral-200 px-4 py-3">
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => onNewCommentChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAddComment(); } }}
            placeholder="Write a comment... (Enter to send, Shift+Enter for new line)"
            data-testid="comment-input"
            rows={2}
            className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
          <button
            onClick={onAddComment}
            disabled={posting || !newComment.trim()}
            data-testid="comment-submit"
            className="self-end rounded-md bg-indigo-600 px-3 py-2 text-white disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}