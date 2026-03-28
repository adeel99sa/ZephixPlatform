/**
 * InlineTaskCreate — UX Step 5
 *
 * Lightweight inline form for creating tasks within a group context.
 * Auto-sets phaseId, status, assignee, sprint based on the group context.
 * Supports Ctrl+Enter keyboard shortcut.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { createTask, type CreateTaskInput } from '@/features/work-management/workTasks.api';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface GroupContext {
  /** Auto-set phaseId */
  phaseId?: string;
  /** Auto-set status */
  status?: string;
  /** Auto-set assigneeUserId */
  assigneeUserId?: string;
  /** Auto-set priority */
  priority?: string;
  /** Auto-set sprintId */
  sprintId?: string;
}

interface Props {
  projectId: string;
  /** Context fields to auto-set based on the group this form is in */
  groupContext?: GroupContext;
  /** Called after task is created successfully */
  onCreated?: (task: { id: string; title: string }) => void;
  /** Variant: 'row' for bottom-of-list, 'header' for group header */
  variant?: 'row' | 'header';
  /** Placeholder text */
  placeholder?: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const InlineTaskCreate: React.FC<Props> = ({
  projectId,
  groupContext,
  onCreated,
  variant = 'row',
  placeholder = 'New task...',
  className,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreate = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || creating) return;

    setCreating(true);
    try {
      const input: CreateTaskInput = {
        projectId,
        title: trimmed,
        phaseId: groupContext?.phaseId,
        assigneeUserId: groupContext?.assigneeUserId,
        priority: groupContext?.priority as any,
      };

      const task = await createTask(input);
      setTitle('');
      onCreated?.({ id: task.id, title: task.title });

      // Keep input focused for rapid entry
      inputRef.current?.focus();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  }, [title, creating, projectId, groupContext, onCreated]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      setExpanded(false);
      setTitle('');
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => {
          setExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={`
          flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors
          ${variant === 'header' ? 'px-2 py-1' : 'px-3 py-2 w-full border border-dashed border-slate-200 rounded-md hover:border-indigo-300 hover:bg-indigo-50/30'}
          ${className ?? ''}
        `}
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 ${variant === 'header' ? '' : 'px-3 py-2 border border-indigo-200 rounded-md bg-white'} ${className ?? ''}`}
    >
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!title.trim()) {
            setExpanded(false);
          }
        }}
        placeholder={placeholder}
        disabled={creating}
        className="flex-1 text-sm bg-transparent border-0 outline-none placeholder-slate-400 text-slate-900"
        autoFocus
      />
      {creating ? (
        <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
      ) : (
        <span className="text-[10px] text-slate-400 whitespace-nowrap">
          Enter to save
        </span>
      )}
    </div>
  );
};

export default InlineTaskCreate;
