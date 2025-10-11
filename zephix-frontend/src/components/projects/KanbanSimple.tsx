import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../../services/api';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
}

interface KanbanSimpleProps {
  projectId: string;
}

interface SortableTaskProps {
  task: Task;
}

const SortableTask: React.FC<SortableTaskProps> = ({ task }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500';
      case 'high': return 'border-l-orange-400';
      case 'medium': return 'border-l-yellow-400';
      case 'low': return 'border-l-green-400';
      default: return 'border-l-gray-400';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white p-4 mb-3 rounded-lg shadow-sm border-l-4 ${getPriorityColor(task.priority)} cursor-move hover:shadow-md transition-shadow`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-900 text-sm">{task.title}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          task.priority === 'critical' ? 'bg-red-100 text-red-800' :
          task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {task.priority}
        </span>
      </div>
      
      {task.description && (
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex justify-between items-center text-xs text-gray-500">
        <div>
          {task.estimatedHours && (
            <span>Est: {task.estimatedHours}h</span>
          )}
          {task.actualHours && (
            <span className="ml-2">Act: {task.actualHours}h</span>
          )}
        </div>
        {task.dueDate && (
          <span>{new Date(task.dueDate).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
};

export const KanbanSimple: React.FC<KanbanSimpleProps> = ({ projectId }) => {
  const [tasks, setTasks] = useState<{
    todo: Task[];
    doing: Task[];
    done: Task[];
  }>({
    todo: [],
    doing: [],
    done: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/projects/${projectId}/tasks`);
      
      if (response.data && response.data.tasks) {
        const projectTasks = response.data.tasks;
        const organizedTasks = {
          todo: projectTasks.filter((task: Task) => task.status === 'pending' || task.status === 'todo'),
          doing: projectTasks.filter((task: Task) => task.status === 'in_progress' || task.status === 'doing'),
          done: projectTasks.filter((task: Task) => task.status === 'completed' || task.status === 'done')
        };
        setTasks(organizedTasks);
      } else {
        // No tasks found for this project
        setTasks({
          todo: [],
          doing: [],
          done: []
        });
      }
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      setError(err.response?.data?.message || 'Failed to load tasks');
      
      // Set empty tasks on error
      setTasks({
        todo: [],
        doing: [],
        done: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = [...tasks.todo, ...tasks.doing, ...tasks.done].find(t => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the task being dragged
    const activeTask = [...tasks.todo, ...tasks.doing, ...tasks.done].find(t => t.id === activeId);
    if (!activeTask) return;

    // Determine the new status based on the drop zone
    let newStatus: 'todo' | 'doing' | 'done';
    if (overId === 'todo-column') newStatus = 'todo';
    else if (overId === 'doing-column') newStatus = 'doing';
    else if (overId === 'done-column') newStatus = 'done';
    else return;

    // Update local state immediately for better UX
    const updatedTask = { ...activeTask, status: newStatus };
    setTasks(prev => {
      const newTasks = { ...prev };
      
      // Remove from old column
      Object.keys(newTasks).forEach(key => {
        newTasks[key as keyof typeof newTasks] = newTasks[key as keyof typeof newTasks].filter(t => t.id !== activeId);
      });
      
      // Add to new column
      newTasks[newStatus].push(updatedTask);
      
      return newTasks;
    });

    // Update on server
    try {
      await api.patch(`/tasks/${activeId}`, { status: newStatus });
      console.log(`Task ${activeId} moved to ${newStatus}`);
    } catch (err) {
      console.error('Failed to update task status:', err);
      // Revert on error
      loadTasks();
    }
  };

  const getColumnTitle = (status: string) => {
    switch (status) {
      case 'todo': return 'To Do';
      case 'doing': return 'In Progress';
      case 'done': return 'Done';
      default: return status;
    }
  };

  const getColumnColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-50 border-gray-200';
      case 'doing': return 'bg-blue-50 border-blue-200';
      case 'done': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading kanban board...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadTasks}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Project Tasks</h3>
        <div className="text-sm text-gray-600">
          {tasks.todo.length + tasks.doing.length + tasks.done.length} total tasks
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-4">
          {Object.entries(tasks).map(([status, statusTasks]) => (
            <div
              key={status}
              id={`${status}-column`}
              className={`flex-1 min-w-80 p-4 rounded-lg border-2 ${getColumnColor(status)}`}
            >
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-gray-900">
                  {getColumnTitle(status)}
                </h4>
                <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-600">
                  {statusTasks.length}
                </span>
              </div>
              
              <SortableContext
                items={statusTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="min-h-96">
                  {statusTasks.map(task => (
                    <SortableTask key={task.id} task={task} />
                  ))}
                  
                  {statusTasks.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <p>No tasks in this column</p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="bg-white p-4 rounded-lg shadow-lg border-l-4 border-blue-500 opacity-90">
              <h4 className="font-semibold text-gray-900 text-sm">{activeTask.title}</h4>
              {activeTask.description && (
                <p className="text-gray-600 text-sm mt-1">{activeTask.description}</p>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="mt-4 text-xs text-gray-500">
        <p>• Drag tasks between columns to change their status</p>
        <p>• Color-coded priority: Red (Critical), Orange (High), Yellow (Medium), Green (Low)</p>
        <p>• Tasks are automatically saved when moved</p>
      </div>
    </div>
  );
};
