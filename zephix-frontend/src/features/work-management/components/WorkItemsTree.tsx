import React from 'react';
import { WorkItem } from '../api';

interface WorkItemsTreeProps {
  items: WorkItem[];
  onSelect: (item: WorkItem) => void;
  onAddTask: () => void;
  onAddSubtask: (parentId: string) => void;
  selectedId?: string | null;
}

const WorkItemRow: React.FC<{
  item: WorkItem;
  level: number;
  onSelect: (item: WorkItem) => void;
  onAddSubtask: (parentId: string) => void;
  selectedId?: string | null;
}> = ({ item, level, onSelect, onAddSubtask, selectedId }) => {
  const isSelected = selectedId === item.id;
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer ${
          isSelected ? 'bg-blue-50 border border-blue-200' : ''
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => onSelect(item)}
      >
        <span className="text-gray-400 text-xs">
          {hasChildren ? '▼' : '▶'}
        </span>
        <span className="flex-1 font-medium">{item.title}</span>
        <span
          className={`px-2 py-1 text-xs rounded ${
            item.status === 'done'
              ? 'bg-green-100 text-green-800'
              : item.status === 'in_progress'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {item.status}
        </span>
        <button
          className="text-xs text-blue-600 hover:text-blue-800"
          onClick={(e) => {
            e.stopPropagation();
            onAddSubtask(item.id);
          }}
        >
          + Subtask
        </button>
      </div>
      {hasChildren &&
        item.children!.map((child) => (
          <WorkItemRow
            key={child.id}
            item={child}
            level={level + 1}
            onSelect={onSelect}
            onAddSubtask={onAddSubtask}
            selectedId={selectedId}
          />
        ))}
    </div>
  );
};

export const WorkItemsTree: React.FC<WorkItemsTreeProps> = ({
  items,
  onSelect,
  onAddTask,
  onAddSubtask,
  selectedId,
}) => {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Work Items</h3>
        <button
          onClick={onAddTask}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + New Task
        </button>
      </div>
      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No work items yet</p>
        ) : (
          items.map((item) => (
            <WorkItemRow
              key={item.id}
              item={item}
              level={0}
              onSelect={onSelect}
              onAddSubtask={onAddSubtask}
              selectedId={selectedId}
            />
          ))
        )}
      </div>
    </div>
  );
};
